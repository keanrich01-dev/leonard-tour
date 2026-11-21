from datetime import datetime
from decimal import Decimal

from sqlalchemy import (Boolean, CheckConstraint, DateTime, ForeignKey, Integer,
                        Numeric, String, Text, UniqueConstraint, func)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Package(Base):
    """Language-neutral data. Text lives in PackageTranslation."""
    __tablename__ = "packages"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(30), index=True)  # safari | climbing | beach
    type: Mapped[str] = mapped_column(String(30), index=True)  # camping, luxury, kilimanjaro ...
    duration_days: Mapped[int] = mapped_column(Integer)
    badge: Mapped[str | None] = mapped_column(String(30))
    hero_image: Mapped[str | None] = mapped_column(String(255))
    gallery_images: Mapped[list] = mapped_column(JSONB, default=list)
    # Configurable child pricing bands; values are decimal multipliers of the adult per-person rate.
    child_pricing_rules: Mapped[dict] = mapped_column(JSONB, default=dict)
    # "From" prices shown on cards. Stored explicitly per currency (no live FX at checkout).
    price_from_usd: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    price_from_tzs: Mapped[Decimal | None] = mapped_column(Numeric(14, 0))
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    legacy_id: Mapped[str | None] = mapped_column(String(120))  # id from old PHP site
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    translations: Mapped[list["PackageTranslation"]] = relationship(
        back_populates="package", cascade="all, delete-orphan")
    prices: Mapped[list["PackagePrice"]] = relationship(
        back_populates="package", cascade="all, delete-orphan")


class PackageTranslation(Base):
    __tablename__ = "package_translations"
    __table_args__ = (UniqueConstraint("package_id", "lang"),
                      CheckConstraint("lang in ('en','sw','fr','zh','ko')", name="ck_pkg_tr_lang"))

    id: Mapped[int] = mapped_column(primary_key=True)
    package_id: Mapped[int] = mapped_column(ForeignKey("packages.id", ondelete="CASCADE"), index=True)
    lang: Mapped[str] = mapped_column(String(5))
    title: Mapped[str] = mapped_column(String(200))
    route: Mapped[str | None] = mapped_column(String(255))
    overview: Mapped[str | None] = mapped_column(Text)
    destinations: Mapped[list] = mapped_column(JSONB, default=list)
    itinerary: Mapped[list] = mapped_column(JSONB, default=list)  # [{day,title,description}]
    inclusions: Mapped[list] = mapped_column(JSONB, default=list)
    exclusions: Mapped[list] = mapped_column(JSONB, default=list)
    # Machine-translated drafts must be reviewed by a human before publishing
    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)

    package: Mapped[Package] = relationship(back_populates="translations")


class PackagePrice(Base):
    """Per-group-size price tiers (replaces the old placeholder pricing_table)."""
    __tablename__ = "package_prices"
    __table_args__ = (UniqueConstraint("package_id", "currency", "pax_min"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    package_id: Mapped[int] = mapped_column(ForeignKey("packages.id", ondelete="CASCADE"), index=True)
    currency: Mapped[str] = mapped_column(String(3))
    pax_min: Mapped[int] = mapped_column(Integer)
    pax_max: Mapped[int | None] = mapped_column(Integer)
    amount_per_person: Mapped[Decimal] = mapped_column(Numeric(14, 2))

    package: Mapped[Package] = relationship(back_populates="prices")
