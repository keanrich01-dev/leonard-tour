from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (Boolean, Date, DateTime, Enum, ForeignKey, Integer, Numeric,
                        SmallInteger, String, Text, func)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.enums import BookingStatus


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # e.g. MK-2026-00042
    package_id: Mapped[int] = mapped_column(ForeignKey("packages.id"), index=True)
    public_token_hash: Mapped[str] = mapped_column(String(64), default="")  # customer access without an account
    public_token_enc: Mapped[str] = mapped_column(String(255), default="")  # encrypted copy so emails can carry the link
    customer_name: Mapped[str] = mapped_column(String(160))
    customer_email: Mapped[str] = mapped_column(String(255), index=True)
    customer_phone: Mapped[str | None] = mapped_column(String(40))
    country: Mapped[str | None] = mapped_column(String(2))  # ISO 3166-1 alpha-2
    language: Mapped[str] = mapped_column(String(5), default="en")  # language for emails
    travel_date: Mapped[date | None] = mapped_column(Date)
    adults: Mapped[int] = mapped_column(SmallInteger, default=1)
    children: Mapped[int] = mapped_column(SmallInteger, default=0)
    child_ages: Mapped[list] = mapped_column(JSONB, default=list)
    price_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict)
    currency: Mapped[str] = mapped_column(String(3))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    deposit_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, native_enum=False, length=20), default=BookingStatus.pending, index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Inquiry(Base):
    __tablename__ = "inquiries"

    id: Mapped[int] = mapped_column(primary_key=True)
    package_id: Mapped[int | None] = mapped_column(ForeignKey("packages.id"))
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(255))
    country: Mapped[str | None] = mapped_column(String(80))
    whatsapp: Mapped[str | None] = mapped_column(String(40))
    travelers: Mapped[int | None] = mapped_column(Integer)
    message: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(5), default="en", server_default="en")
    status: Mapped[str] = mapped_column(String(20), default="new")  # new | replied | converted
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Testimonial(Base):
    __tablename__ = "testimonials"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str | None] = mapped_column(String(80))
    photo_path: Mapped[str | None] = mapped_column(String(255))
    rating: Mapped[int] = mapped_column(SmallInteger, default=5)
    message: Mapped[str] = mapped_column(Text)
    lang: Mapped[str] = mapped_column(String(5), default="en")
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    moderation_status: Mapped[str] = mapped_column(String(12), default="pending", server_default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
