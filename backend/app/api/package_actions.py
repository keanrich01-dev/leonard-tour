from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import client_ip
from app.core.db import get_db
from app.core.config import settings
from app.core.ratelimit import limiter
from app.models import Inquiry, Package
from app.services import notify
from app.services.pricing import PricingError, make_quote

router = APIRouter(prefix="/api", tags=["package details", "pricing", "inquiries"])


class QuoteRequest(BaseModel):
    package_slug: str = Field(min_length=2, max_length=120)
    adults: int = Field(ge=1, le=50)
    children_ages: list[int] = Field(default_factory=list, max_length=50)
    currency: Literal["USD", "TZS"] = "USD"


class InquiryRequest(BaseModel):
    package_slug: str | None = Field(default=None, max_length=120)
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    country: str | None = Field(default=None, max_length=80)
    whatsapp: str | None = Field(default=None, max_length=40)
    travelers: int | None = Field(default=None, ge=1, le=100)
    message: str = Field(min_length=10, max_length=3000)
    language: Literal["en", "sw", "fr", "zh", "ko"] = "en"


@router.post("/pricing/quote")
def calculate_public_quote(body: QuoteRequest, db: Session = Depends(get_db)):
    children = len(body.children_ages)
    if any(age < 0 or age > 15 for age in body.children_ages):
        raise HTTPException(422, "Travellers aged 16 or above must be counted as adults.")
    pkg = db.scalar(
        select(Package)
        .options(selectinload(Package.prices))
        .where(Package.slug == body.package_slug, Package.is_published.is_(True))
    )
    if pkg is None:
        raise HTTPException(404, "Package not found")
    try:
        quote = make_quote(pkg, body.currency, body.adults, children, body.children_ages)
    except PricingError as exc:
        raise HTTPException(422, str(exc)) from exc
    return {
        "package_slug": pkg.slug,
        "currency": quote.currency,
        "adult_count": body.adults,
        "child_count": children,
        "adult_unit_price": str(quote.per_person),
        "adults_total": str(quote.adults_total),
        "children_total": str(quote.children_total),
        "child_discount_total": str(quote.discount_total),
        "children": quote.children_breakdown,
        "total": str(quote.total),
        "deposit": str(quote.deposit),
        "balance_after_deposit": str(quote.total - quote.deposit),
        "deposit_percent": settings.deposit_percent,
        "requires_manual_confirmation": bool((pkg.child_pricing_rules or {}).get("provisional", False)) and bool(children),
        "pricing_basis": "per_person",
    }


@router.post("/inquiries", status_code=201)
def create_package_inquiry(
    body: InquiryRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    ip = client_ip(request)
    if not limiter.hit(f"package-inquiry:{ip}", 8, 3600):
        raise HTTPException(429, "Too many inquiries. Please try again later.")

    package_id = None
    if body.package_slug:
        pkg = db.scalar(select(Package).where(
            Package.slug == body.package_slug,
            Package.is_published.is_(True),
        ))
        if pkg is None:
            raise HTTPException(404, "Package not found")
        package_id = pkg.id

    row = Inquiry(
        package_id=package_id,
        name=body.name.strip(),
        email=str(body.email).strip().lower(),
        country=body.country.strip() if body.country else None,
        whatsapp=body.whatsapp.strip() if body.whatsapp else None,
        travelers=body.travelers,
        message=body.message.strip(),
        language=body.language,
        status="new",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    notify.enqueue_email("admin_new_inquiry", row.id)
    notify.enqueue_email("customer_inquiry_received", row.id)
    return {
        "id": row.id,
        "status": row.status,
        "message": "Your question has been received. Our team will get back to you.",
    }
