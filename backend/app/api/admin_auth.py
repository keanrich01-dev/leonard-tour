import time
from datetime import timedelta

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (COOKIE_NAME, AuthContext, client_ip, current_auth, now,
                          revoke_user_sessions, verified_auth)
from app.core.config import settings
from app.core.db import get_db
from app.core.permissions import STAFF_ROLES, permissions_for
from app.core.ratelimit import limiter
from app.core.security import (DUMMY_HASH, decrypt, encrypt, hash_password, hash_recovery_code,
                               hash_token, needs_rehash, new_recovery_codes, new_token,
                               password_problems, safe_equal, verify_password)
from app.models import AuthSession, User
from app.services import notify
from app.services.audit import audit

router = APIRouter(prefix="/api/admin/auth", tags=["admin-auth"])
GENERIC_LOGIN_ERROR = "Invalid email or password"
ISSUER = "Leonard Tour"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class CodeIn(BaseModel):
    code: str


class PasswordIn(BaseModel):
    current_password: str
    new_password: str


def _set_cookie(response: Response, token: str):
    response.set_cookie(COOKIE_NAME, token, httponly=True,
                        secure=settings.cookie_secure, samesite="none", path="/api/admin")


def _user_out(u: User, s: AuthSession | None = None) -> dict:
    out = {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.value,
           "mfa_enabled": u.mfa_enabled, "permissions": sorted(permissions_for(u))}
    if s is not None:
        out["mfa_verified"] = s.mfa_verified
    return out


def _totp_step_ok(user: User, code: str) -> bool:
    """Accept the code for the current +/-1 30s step, and never the same step twice (anti-replay)."""
    if not user.mfa_secret_enc or not code.isdigit() or len(code) != 6:
        return False
    totp = pyotp.TOTP(decrypt(user.mfa_secret_enc))
    cur = int(time.time() // 30)
    for step in (cur - 1, cur, cur + 1):
        if safe_equal(totp.at(step * 30), code) and step > (user.mfa_last_step or 0):
            user.mfa_last_step = step
            return True
    return False


def _issue_session(db: Session, user: User, request: Request, mfa_verified: bool) -> tuple[AuthSession, str]:
    token = new_token()
    s = AuthSession(user_id=user.id, token_hash=hash_token(token), csrf_token=new_token(),
                    mfa_verified=mfa_verified, ip_address=client_ip(request),
                    user_agent=(request.headers.get("user-agent") or "")[:255])
    db.add(s)
    db.flush()
    return s, token


@router.post("/login")
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request)
    if not limiter.hit(f"login:ip:{ip}", settings.login_ip_limit, settings.login_ip_window_seconds):
        raise HTTPException(429, "Too many attempts. Try again later.")
    email = body.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    t = now()
    locked = bool(user and user.locked_until and user.locked_until > t)
    # Always run one Argon2 verification so timing doesn't reveal whether the account exists/is locked.
    password_ok = verify_password(user.password_hash if user else DUMMY_HASH, body.password)
    ok = bool(user and password_ok and not locked and user.is_active and user.role in STAFF_ROLES)

    if not ok:
        newly_locked = False
        if user and not locked and user.role in STAFF_ROLES:
            user.failed_logins = (user.failed_logins or 0) + 1
            if user.failed_logins >= settings.lockout_threshold:
                newly_locked = True
                user.locked_until = t + timedelta(minutes=settings.lockout_minutes)
                user.failed_logins = 0
                audit(db, user_id=user.id, action="auth.account_locked", entity_type="user",
                      entity_id=user.id, ip=ip)
        audit(db, user_id=user.id if user else None, action="auth.login_failed", entity_type="user",
              entity_id=user.id if user else None, after={"locked": locked}, ip=ip)
        db.commit()
        if newly_locked:  # at most one alert per hour per account, so lockouts can't be used to spam the user
            notify.security_alert(user.id, "account_locked", bucket=t.strftime("%Y%m%d%H"))
        raise HTTPException(401, GENERIC_LOGIN_ERROR)

    user.failed_logins = 0
    user.locked_until = None
    user.last_login_at = t
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)
    s, token = _issue_session(db, user, request, mfa_verified=False)
    audit(db, user_id=user.id, action="auth.password_ok", entity_type="user", entity_id=user.id, ip=ip)
    db.commit()
    _set_cookie(response, token)
    return {"mfa_required": user.mfa_enabled, "mfa_setup_required": not user.mfa_enabled,
            "csrf_token": s.csrf_token, "user": _user_out(user, s)}


@router.post("/mfa/verify")
def mfa_verify(body: CodeIn, request: Request, response: Response,
               ctx: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    user, s = ctx.user, ctx.session
    if not user.mfa_enabled:
        raise HTTPException(409, "MFA is not set up yet")
    if not limiter.hit(f"mfa:{s.id}", 5, 600):
        s.revoked_at = now()
        audit(db, user_id=user.id, action="auth.mfa_locked", entity_type="user", entity_id=user.id, ip=ctx.ip)
        db.commit()
        raise HTTPException(429, "Too many attempts. Please log in again.")
    code = body.code.strip().replace(" ", "")
    used_recovery = False
    ok = _totp_step_ok(user, code)
    if not ok:
        h = hash_recovery_code(code)
        if h in (user.mfa_recovery_hashes or []):
            user.mfa_recovery_hashes = [x for x in user.mfa_recovery_hashes if x != h]
            ok = used_recovery = True
    if not ok:
        audit(db, user_id=user.id, action="auth.mfa_failed", entity_type="user", entity_id=user.id, ip=ctx.ip)
        db.commit()
        raise HTTPException(401, "Invalid code")
    token = new_token()  # rotate session id after privilege change (prevents fixation)
    s.token_hash, s.csrf_token, s.mfa_verified = hash_token(token), new_token(), True
    audit(db, user_id=user.id, action="auth.login_success", entity_type="user", entity_id=user.id,
          after={"recovery_code_used": used_recovery,
                 "recovery_codes_left": len(user.mfa_recovery_hashes or [])}, ip=ctx.ip)
    db.commit()
    _set_cookie(response, token)
    return {"csrf_token": s.csrf_token, "user": _user_out(user, s),
            "recovery_codes_left": len(user.mfa_recovery_hashes or [])}


@router.post("/mfa/setup")
def mfa_setup(ctx: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    user = ctx.user
    if user.mfa_enabled:
        raise HTTPException(409, "MFA is already enabled")
    secret = pyotp.random_base32()
    user.mfa_secret_enc = encrypt(secret)
    db.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=ISSUER)
    return {"secret": secret, "otpauth_uri": uri}


@router.post("/mfa/enable")
def mfa_enable(body: CodeIn, response: Response, ctx: AuthContext = Depends(current_auth),
               db: Session = Depends(get_db)):
    user, s = ctx.user, ctx.session
    if user.mfa_enabled:
        raise HTTPException(409, "MFA is already enabled")
    if not limiter.hit(f"mfa:{s.id}", 5, 600):
        raise HTTPException(429, "Too many attempts")
    if not user.mfa_secret_enc or not _totp_step_ok(user, body.code.strip()):
        raise HTTPException(400, "Invalid code. Check your authenticator app's clock and try again.")
    codes = new_recovery_codes()
    user.mfa_enabled = True
    user.mfa_recovery_hashes = [hash_recovery_code(c) for c in codes]
    token = new_token()
    s.token_hash, s.csrf_token, s.mfa_verified = hash_token(token), new_token(), True
    audit(db, user_id=user.id, action="auth.mfa_enabled", entity_type="user", entity_id=user.id, ip=ctx.ip)
    db.commit()
    notify.security_alert(user.id, "mfa_enabled")
    _set_cookie(response, token)
    return {"recovery_codes": codes, "csrf_token": s.csrf_token,
            "note": "Store these codes safely. They are shown only once."}


@router.get("/me")
def me(ctx: AuthContext = Depends(current_auth)):
    return {"user": _user_out(ctx.user, ctx.session), "csrf_token": ctx.session.csrf_token}


@router.post("/logout")
def logout(response: Response, ctx: AuthContext = Depends(current_auth), db: Session = Depends(get_db)):
    ctx.session.revoked_at = now()
    audit(db, user_id=ctx.user.id, action="auth.logout", entity_type="user", entity_id=ctx.user.id, ip=ctx.ip)
    db.commit()
    response.delete_cookie(COOKIE_NAME, path="/api/admin")
    return {"ok": True}


@router.post("/change-password")
def change_password(body: PasswordIn, ctx: AuthContext = Depends(verified_auth), db: Session = Depends(get_db)):
    user = ctx.user
    if not verify_password(user.password_hash, body.current_password):
        raise HTTPException(401, "Current password is incorrect")
    problems = password_problems(body.new_password, user.email)
    if problems:
        raise HTTPException(422, problems)
    user.password_hash = hash_password(body.new_password)
    user.password_changed_at = now()
    revoke_user_sessions(db, user.id, except_session_id=ctx.session.id)
    audit(db, user_id=user.id, action="auth.password_changed", entity_type="user", entity_id=user.id, ip=ctx.ip)
    db.commit()
    notify.security_alert(user.id, "password_changed")
    return {"ok": True, "other_sessions_revoked": True}
