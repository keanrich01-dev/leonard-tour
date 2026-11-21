import secrets
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import client_ip
from app.core.config import settings
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.core.security import encrypt, hash_token, new_token, safe_equal
from app.services import notify
from app.models import Booking, Package, Payment
from app.models.enums import LANGUAGES, BookingStatus, PaymentKind, PaymentStatus
from app.payments import get_provider
from app.payments.base import PaymentProvider, PaymentProviderError
from app.services.audit import audit
from app.services.payments import paid_total, verify_payment
from app.services.pricing import PricingError, make_quote

router = APIRouter(prefix="/api", tags=["bookings"])


class BookingIn(BaseModel):
    package_slug: str
    travel_date: date
    adults: int = Field(ge=1, le=50)
    children: int = Field(0, ge=0, le=50)
    children_ages: list[int] = Field(default_factory=list, max_length=50)
    currency: Literal["USD", "TZS"]
    customer_name: str = Field(min_length=2, max_length=160)
    customer_email: EmailStr
    customer_phone: str | None = Field(None, max_length=40)
    country: str | None = Field(None, min_length=2, max_length=2)  # ISO alpha-2
    language: str = "en"
    notes: str | None = Field(None, max_length=2000)


class PayIn(BaseModel):
    kind: PaymentKind = PaymentKind.deposit


def _booking_for(db: Session, reference: str, token: str | None) -> Booking:
    b = db.scalar(select(Booking).where(Booking.reference == reference))
    # Same 404 whether the booking is missing or the token is wrong (no enumeration)
    if b is None or not token or not b.public_token_hash or not safe_equal(hash_token(token), b.public_token_hash):
        raise HTTPException(404, "Booking not found")
    return b


def _public(b: Booking, db: Session) -> dict:
    paid = paid_total(db, b.id)
    pays = db.scalars(select(Payment).where(Payment.booking_id == b.id).order_by(Payment.id)).all()
    return {"reference": b.reference, "status": b.status.value, "currency": b.currency,
            "total": str(b.total_amount), "deposit": str(b.deposit_amount), "paid": str(paid),
            "balance_due": str(b.total_amount - paid), "travel_date": b.travel_date.isoformat(),
            "adults": b.adults, "children": b.children, "children_ages": b.child_ages or [],
            "price_breakdown": b.price_breakdown or {},
            "payments": [{"id": p.id, "kind": p.kind.value, "amount": str(p.amount), "currency": p.currency,
                          "status": p.status.value, "method": p.method.value if p.method else None,
                          "paid_at": p.paid_at} for p in pays]}


@router.post("/bookings", status_code=201)
def create_booking(body: BookingIn, request: Request, db: Session = Depends(get_db)):
    if not limiter.hit(f"booking:ip:{client_ip(request)}", 10, 3600):
        raise HTTPException(429, "Too many booking requests. Please try again later.")
    if body.language not in LANGUAGES:
        raise HTTPException(422, f"language must be one of {LANGUAGES}")
    if body.children_ages and len(body.children_ages) != body.children:
        raise HTTPException(422, "Please provide the age of every child.")
    if any(age < 0 or age > 15 for age in body.children_ages):
        raise HTTPException(422, "Travellers aged 16 or above must be counted as adults.")
    if body.adults + body.children > settings.max_group_size:
        raise HTTPException(422, f"Groups over {settings.max_group_size} people: please contact us")
    if body.travel_date < date.today() + timedelta(days=settings.min_lead_days):
        raise HTTPException(422, "Travel date is too soon or in the past")
    pkg = db.scalar(select(Package).options(selectinload(Package.prices))
                    .where(Package.slug == body.package_slug, Package.is_published.is_(True)))
    if pkg is None:
        raise HTTPException(404, "Package not found")
    try:
        child_ages = body.children_ages or ([15] * body.children)
        q = make_quote(pkg, body.currency, body.adults, body.children, child_ages)
    except PricingError as e:
        raise HTTPException(422, str(e))
    token = new_token()
    for _ in range(5):
        ref = f"MK-{date.today().year}-{secrets.token_hex(3).upper()}"  # non-sequential: hides business volume
        if not db.scalar(select(Booking.id).where(Booking.reference == ref)):
            break
    b = Booking(reference=ref, public_token_hash=hash_token(token), public_token_enc=encrypt(token), package_id=pkg.id,
                customer_name=body.customer_name.strip(), customer_email=body.customer_email.lower(),
                customer_phone=body.customer_phone, country=body.country.upper() if body.country else None,
                language=body.language, travel_date=body.travel_date, adults=body.adults, children=body.children,
                currency=q.currency, total_amount=q.total, deposit_amount=q.deposit,
                child_ages=child_ages, price_breakdown=q.as_dict(), notes=body.notes)
    db.add(b)
    db.flush()
    audit(db, user_id=None, action="booking.create", entity_type="booking", entity_id=b.id,
          after={"reference": ref, "package": pkg.slug, "total": str(q.total), "currency": q.currency},
          ip=client_ip(request))
    db.commit()
    notify.enqueue_email("booking_created", b.id)
    notify.enqueue_email("admin_new_booking", b.id)
    # The token is shown ONCE (and will be emailed as a link). It is the customer's key to this booking.
    return {**_public(b, db), "access_token": token}


@router.get("/bookings/{reference}")
def get_booking(reference: str, x_booking_token: str | None = Header(None), db: Session = Depends(get_db)):
    return _public(_booking_for(db, reference, x_booking_token), db)


@router.post("/bookings/{reference}/pay")
def start_payment(reference: str, body: PayIn, request: Request, x_booking_token: str | None = Header(None),
                  db: Session = Depends(get_db), provider: PaymentProvider = Depends(get_provider)):
    ip = client_ip(request)
    if not limiter.hit(f"pay:ip:{ip}", 20, 3600):
        raise HTTPException(429, "Too many payment attempts. Please try again later.")
    b = _booking_for(db, reference, x_booking_token)
    db.refresh(b, with_for_update=True)  # serialize concurrent payment starts for this booking
    if b.status in (BookingStatus.cancelled, BookingStatus.completed):
        raise HTTPException(409, f"Booking is {b.status.value}")
    paid = paid_total(db, b.id)
    due = b.total_amount - paid
    if due <= 0:
        raise HTTPException(409, "Booking is already fully paid")
    # Amount is ALWAYS computed on the server from the booking, never taken from the request.
    if body.kind == PaymentKind.deposit:
        if paid > 0:
            raise HTTPException(409, "Deposit already paid; pay the balance instead")
        amount = b.deposit_amount
    elif body.kind == PaymentKind.balance:
        if paid <= 0:
            raise HTTPException(409, "Nothing paid yet; choose deposit or full payment")
        amount = due
    else:
        amount = due
    merchant_ref = f"{b.reference}-{secrets.token_hex(4).upper()}"
    pay = Payment(booking_id=b.id, provider=provider.name, merchant_reference=merchant_ref, kind=body.kind,
                  amount=amount, currency=b.currency, status=PaymentStatus.pending)
    db.add(pay)
    db.flush()
    try:
        session = provider.create_checkout(
            merchant_reference=merchant_ref, amount=amount, currency=b.currency, customer_email=b.customer_email,
            customer_phone=b.customer_phone, customer_name=b.customer_name, country=b.country,
            description=f"Leonard Tour booking {b.reference} ({body.kind.value})",
            callback_url=f"{settings.frontend_url}/booking/{b.reference}/payment-result",
            ipn_url=f"{settings.public_api_url}/api/payments/{provider.name}/ipn")
    except PaymentProviderError as e:
        pay.status = PaymentStatus.failed
        audit(db, user_id=None, action="payment.checkout_error", entity_type="payment", entity_id=pay.id,
              after={"error": str(e)[:300]}, ip=ip)
        db.commit()
        raise HTTPException(502, "Payment service is temporarily unavailable. Please try again.")
    pay.provider_reference = session.provider_reference
    audit(db, user_id=None, action="payment.initiated", entity_type="payment", entity_id=pay.id,
          after={"booking": b.reference, "amount": str(amount), "currency": b.currency}, ip=ip)
    db.commit()
    return {"payment_id": pay.id, "amount": str(amount), "currency": b.currency, "redirect_url": session.redirect_url}


@router.get("/bookings/{reference}/status")
def booking_status(reference: str, refresh: bool = Query(True), x_booking_token: str | None = Header(None),
                   db: Session = Depends(get_db), provider: PaymentProvider = Depends(get_provider)):
    """Frontend polls this after the customer returns from the gateway. Pending payments are re-verified with the provider."""
    b = _booking_for(db, reference, x_booking_token)
    if refresh:
        pend = db.scalars(select(Payment).where(Payment.booking_id == b.id, Payment.status == PaymentStatus.pending,
                                                Payment.provider_reference.is_not(None)).with_for_update()).all()
        outcomes = []
        for p in pend:
            try:
                outcomes.append((verify_payment(db, p, provider, "poll"), p.id))
            except PaymentProviderError:
                pass  # try again on next poll; IPN will also arrive
        db.commit()
        for outcome, pid in outcomes:
            notify.payment_outcome(outcome, pid)
    return _public(b, db)
