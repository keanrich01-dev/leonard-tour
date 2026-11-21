from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.enums import Role


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(String(255))  # Argon2id
    role: Mapped[Role] = mapped_column(Enum(Role, native_enum=False, length=30), default=Role.customer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # MFA (TOTP). Secret stored encrypted at application level.
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_secret_enc: Mapped[str | None] = mapped_column(String(255))
    # Brute-force protection
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    mfa_last_step: Mapped[int] = mapped_column(Integer, default=0)  # blocks TOTP replay
    mfa_recovery_hashes: Mapped[list] = mapped_column(JSONB, default=list)
    # Permissions granted on top of the role (e.g. "payments.override"); every change is audited
    extra_permissions: Mapped[list] = mapped_column(JSONB, default=list)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
