from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_permission, revoke_user_sessions
from app.core.db import get_db
from app.core.permissions import ALL, SPECIAL, STAFF_ROLES
from app.core.security import hash_password, password_problems
from app.models import AuditLog, User
from app.models.enums import Role
from app.services import notify
from app.services.audit import audit

router = APIRouter(prefix="/api/admin", tags=["admin"])


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: Role
    password: str


class UserPatch(BaseModel):
    role: Role | None = None
    is_active: bool | None = None
    extra_permissions: list[str] | None = None


def _out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.value,
            "is_active": u.is_active, "mfa_enabled": u.mfa_enabled,
            "extra_permissions": u.extra_permissions or [],
            "locked": bool(u.locked_until), "last_login_at": u.last_login_at}


def _get_user(db: Session, user_id: int) -> User:
    u = db.get(User, user_id)
    if u is None:
        raise HTTPException(404, "User not found")
    return u


@router.get("/users")
def list_users(ctx: AuthContext = Depends(require_permission("users.manage")), db: Session = Depends(get_db)):
    return [_out(u) for u in db.scalars(select(User).where(User.role.in_([r.value for r in STAFF_ROLES]))
                                        .order_by(User.id))]


@router.post("/users", status_code=201)
def create_user(body: UserCreate, ctx: AuthContext = Depends(require_permission("users.manage")),
                db: Session = Depends(get_db)):
    if body.role not in STAFF_ROLES:
        raise HTTPException(422, "Role must be a staff role")
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email already in use")
    problems = password_problems(body.password, email)
    if problems:
        raise HTTPException(422, problems)
    u = User(email=email, full_name=body.full_name.strip(), role=body.role,
             password_hash=hash_password(body.password), is_active=True)
    db.add(u)
    db.flush()
    audit(db, user_id=ctx.user.id, action="user.create", entity_type="user", entity_id=u.id,
          after={"email": email, "role": body.role.value}, ip=ctx.ip)
    db.commit()
    return _out(u)


@router.patch("/users/{user_id}")
def update_user(user_id: int, body: UserPatch, ctx: AuthContext = Depends(require_permission("users.manage")),
                db: Session = Depends(get_db)):
    u = _get_user(db, user_id)
    if u.id == ctx.user.id and (body.role not in (None, u.role) or body.is_active is False
                                or body.extra_permissions is not None):
        raise HTTPException(409, "You cannot change your own role, status or permissions")
    before = {"role": u.role.value, "is_active": u.is_active, "extra_permissions": u.extra_permissions or []}
    if body.role is not None:
        if body.role not in STAFF_ROLES:
            raise HTTPException(422, "Role must be a staff role")
        u.role = body.role
    if body.is_active is not None:
        u.is_active = body.is_active
    if body.extra_permissions is not None:
        bad = [p for p in body.extra_permissions if p not in ALL | SPECIAL]
        if bad:
            raise HTTPException(422, f"Unknown permissions: {bad}")
        u.extra_permissions = sorted(set(body.extra_permissions))
    after = {"role": u.role.value, "is_active": u.is_active, "extra_permissions": u.extra_permissions or []}
    if after != before:
        revoke_user_sessions(db, u.id)  # force re-login so new rights/limits apply immediately
        audit(db, user_id=ctx.user.id, action="user.update", entity_type="user", entity_id=u.id,
              before=before, after=after, ip=ctx.ip)
    db.commit()
    return _out(u)


@router.post("/users/{user_id}/reset-mfa")
def reset_mfa(user_id: int, ctx: AuthContext = Depends(require_permission("users.manage")),
              db: Session = Depends(get_db)):
    u = _get_user(db, user_id)
    u.mfa_enabled, u.mfa_secret_enc, u.mfa_recovery_hashes, u.mfa_last_step = False, None, [], 0
    revoke_user_sessions(db, u.id)
    audit(db, user_id=ctx.user.id, action="user.reset_mfa", entity_type="user", entity_id=u.id, ip=ctx.ip)
    db.commit()
    notify.security_alert(u.id, "mfa_reset")
    return {"ok": True, "note": "User must enroll MFA again at next login."}


@router.post("/users/{user_id}/unlock")
def unlock(user_id: int, ctx: AuthContext = Depends(require_permission("users.manage")),
           db: Session = Depends(get_db)):
    u = _get_user(db, user_id)
    u.locked_until, u.failed_logins = None, 0
    audit(db, user_id=ctx.user.id, action="user.unlock", entity_type="user", entity_id=u.id, ip=ctx.ip)
    db.commit()
    return {"ok": True}


@router.get("/audit")
def list_audit(action: str | None = None, limit: int = Query(100, le=500), offset: int = 0,
               ctx: AuthContext = Depends(require_permission("audit.read")), db: Session = Depends(get_db)):
    q = select(AuditLog).order_by(AuditLog.id.desc()).limit(limit).offset(offset)
    if action:
        q = q.where(AuditLog.action == action)
    return [{"id": a.id, "user_id": a.user_id, "action": a.action, "entity_type": a.entity_type,
             "entity_id": a.entity_id, "before": a.before, "after": a.after, "ip": a.ip_address,
             "at": a.created_at} for a in db.scalars(q)]
