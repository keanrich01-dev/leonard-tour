from datetime import datetime
from decimal import Decimal

from sqlalchemy import (Boolean, CheckConstraint, DateTime, Enum, ForeignKey, Numeric,
                        String, UniqueConstraint, func)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.enums import PaymentKind, PaymentMethod, PaymentStatus


class Payment(Base):
    """One attempt to collect money. Only the verified webhook/status-query path may set status=paid."""
    __tablename__ = "payments"
    __table_args__ = (CheckConstraint("amount > 0", name="ck_payment_amount_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), index=True)
    provider: Mapped[str] = mapped_column(String(30))  # pesapal | selcom | manual
    merchant_reference: Mapped[str] = mapped_column(String(64), unique=True)  # our id sent to provider
    provider_reference: Mapped[str | None] = mapped_column(String(120), unique=True)  # their tracking id
    kind: Mapped[PaymentKind] = mapped_column(Enum(PaymentKind, native_enum=False, length=20))
    method: Mapped[PaymentMethod | None] = mapped_column(Enum(PaymentMethod, native_enum=False, length=20))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, native_enum=False, length=20), default=PaymentStatus.pending, index=True)
    verified_with_provider: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PaymentEvent(Base):
    """Append-only log of every webhook/status response (idempotency + audit)."""
    __tablename__ = "payment_events"
    __table_args__ = (UniqueConstraint("provider", "event_id", name="uq_payment_event_idempotency"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[int | None] = mapped_column(ForeignKey("payments.id"), index=True)
    provider: Mapped[str] = mapped_column(String(30))
    event_id: Mapped[str] = mapped_column(String(160))
    event_type: Mapped[str] = mapped_column(String(60))
    payload: Mapped[dict] = mapped_column(JSONB)
    signature_valid: Mapped[bool] = mapped_column(Boolean, default=False)
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
