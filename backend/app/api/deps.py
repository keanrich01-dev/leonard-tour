from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.permissions import STAFF_ROLES, has_permission
from app.core.security import hash_token, safe_equal
from app.models import AuthSession, User

COOKIE_NAME = "mk_session"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def now() -> datetime:
    return datetime.now(timezone.utc)


def client_ip(request: Request) -> str:
    if settings.trust_proxy:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@dataclass
class AuthContext:
    user: User
    session: AuthSession
    ip: str


def revoke_user_sessions(db: Session, user_id: int, except_session_id: int | None = None):
    q = update(AuthSession).where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
    if except_session_id:
        q = q.where(AuthSession.id != except_session_id)
    db.execute(q.values(revoked_at=now()))


def current_auth(request: Request, db: Session = Depends(get_db)) -> AuthContext:
    """Valid session (may still be waiting for MFA). Enforces expiry, idle timeout and CSRF."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(401, "Not authenticated")
    s = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    t = now()
    if s is None or s.revoked_at is not None:
        raise HTTPException(401, "Not authenticated")
    max_age = timedelta(hours=settings.session_hours) if s.mfa_verified \
        else timedelta(minutes=settings.unverified_session_minutes)
    idle = timedelta(minutes=settings.session_idle_minutes)
    if t - s.created_at > max_age or t - s.last_seen_at > idle:
        s.revoked_at = t
        db.commit()
        raise HTTPException(401, "Session expired")
    user = db.get(User, s.user_id)
    if user is None or not user.is_active or user.role not in STAFF_ROLES:
        raise HTTPException(401, "Not authenticated")
    if request.method not in SAFE_METHODS:
        sent = request.headers.get("x-csrf-token", "")
        if not sent or not safe_equal(sent, s.csrf_token):
            raise HTTPException(403, "CSRF token missing or invalid")
    if (t - s.last_seen_at).total_seconds() > 60:  # avoid a write on every request
        s.last_seen_at = t
        db.commit()
    return AuthContext(user=user, session=s, ip=client_ip(request))


def verified_auth(ctx: AuthContext = Depends(current_auth)) -> AuthContext:
    """Fully authenticated: password AND second factor done."""
    if not ctx.session.mfa_verified:
        raise HTTPException(403, "mfa_required")
    return ctx


def require_permission(perm: str):
    def dep(ctx: AuthContext = Depends(verified_auth)) -> AuthContext:
        if not has_permission(ctx.user, perm):
            raise HTTPException(403, "You do not have permission to do this")
        return ctx
    return dep
