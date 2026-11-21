from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_permission
from app.core.db import get_db
from app.models import Booking, Package, Payment
from app.models.enums import BookingStatus, PaymentStatus
from app.payments import get_provider
from app.payments.base import PaymentProvider, PaymentProviderError
from app.services import notify
from app.services.audit import audit
from app.services.payments import paid_total, verify_payment

router = APIRouter(prefix="/api/admin", tags=["admin-bookings"])

ALLOWED = {BookingStatus.pending: {BookingStatus.confirmed, BookingStatus.cancelled},
           BookingStatus.confirmed: {BookingStatus.completed, BookingStatus.cancelled},
           BookingStatus.cancelled: set(), BookingStatus.completed: set()}


class BookingPatch(BaseModel):
    status: BookingStatus | None = None
    notes: str | None = None


def _booking_out(b: Booking, db: Session, with_payments: bool = False) -> dict:
    out = {"id": b.id, "reference": b.reference, "package_id": b.package_id, "status": b.status.value,
           "customer_name": b.customer_name, "customer_email": b.customer_email, "customer_phone": b.customer_phone,
           "country": b.country, "language": b.language, "travel_date": b.travel_date, "adults": b.adults,
           "children": b.children, "children_ages": b.child_ages or [], "price_breakdown": b.price_breakdown or {}, "currency": b.currency, "total": str(b.total_amount),
           "deposit": str(b.deposit_amount), "paid": str(paid_total(db, b.id)), "notes": b.notes,
           "created_at": b.created_at}
    if with_payments:
        out["payments"] = [_payment_out(p) for p in db.scalars(
            select(Payment).where(Payment.booking_id == b.id).order_by(Payment.id))]
    return out


def _payment_out(p: Payment) -> dict:
    return {"id": p.id, "booking_id": p.booking_id, "provider": p.provider, "merchant_reference": p.merchant_reference,
            "provider_reference": p.provider_reference, "kind": p.kind.value, "method": p.method.value if p.method else None,
            "amount": str(p.amount), "currency": p.currency, "status": p.status.value,
            "verified_with_provider": p.verified_with_provider, "paid_at": p.paid_at, "created_at": p.created_at}


@router.get("/bookings")
def list_bookings(status: BookingStatus | None = None, limit: int = Query(50, le=200), offset: int = 0,
                  ctx: AuthContext = Depends(require_permission("bookings.read")), db: Session = Depends(get_db)):
    q = select(Booking).order_by(Booking.id.desc()).limit(limit).offset(offset)
    if status:
        q = q.where(Booking.status == status)
    return [_booking_out(b, db) for b in db.scalars(q)]


@router.get("/bookings/{booking_id}")
def get_booking(booking_id: int, ctx: AuthContext = Depends(require_permission("bookings.read")),
                db: Session = Depends(get_db)):
    b = db.get(Booking, booking_id)
    if not b:
        raise HTTPException(404, "Booking not found")
    return _booking_out(b, db, with_payments=True)


@router.patch("/bookings/{booking_id}")
def update_booking(booking_id: int, body: BookingPatch,
                   ctx: AuthContext = Depends(require_permission("bookings.write")), db: Session = Depends(get_db)):
    b = db.get(Booking, booking_id)
    if not b:
        raise HTTPException(404, "Booking not found")
    before = {"status": b.status.value, "notes": b.notes}
    warning = None
    cancelled_now = False
    if body.status is not None and body.status != b.status:
        if body.status not in ALLOWED[b.status]:
            raise HTTPException(409, f"Cannot change status from {b.status.value} to {body.status.value}")
        if body.status == BookingStatus.cancelled and paid_total(db, b.id) > 0:
            warning = "Booking has paid payments: a refund must be handled by Finance."
        cancelled_now = body.status == BookingStatus.cancelled
        b.status = body.status
    if body.notes is not None:
        b.notes = body.notes
    after = {"status": b.status.value, "notes": b.notes}
    if before != after:
        audit(db, user_id=ctx.user.id, action="booking.update", entity_type="booking", entity_id=b.id,
              before=before, after=after, ip=ctx.ip)
    db.commit()
    if cancelled_now:
        notify.enqueue_email("booking_cancelled", b.id)
    return {**_booking_out(b, db, with_payments=True), "warning": warning}


@router.get("/payments")
def list_payments(status: PaymentStatus | None = None, limit: int = Query(50, le=200), offset: int = 0,
                  ctx: AuthContext = Depends(require_permission("payments.read")), db: Session = Depends(get_db)):
    q = select(Payment).order_by(Payment.id.desc()).limit(limit).offset(offset)
    if status:
        q = q.where(Payment.status == status)
    return [_payment_out(p) for p in db.scalars(q)]


@router.post("/payments/{payment_id}/recheck")
def recheck_payment(payment_id: int, ctx: AuthContext = Depends(require_permission("payments.read")),
                    db: Session = Depends(get_db), provider: PaymentProvider = Depends(get_provider)):
    """Re-ask the gateway for the truth. This is the only 'fix' for a stuck payment: nobody edits payment rows by hand."""
    p = db.scalar(select(Payment).where(Payment.id == payment_id).with_for_update())
    if not p or not p.provider_reference:
        raise HTTPException(404, "Payment not found or never reached the gateway")
    try:
        outcome = verify_payment(db, p, provider, "admin_recheck")
    except PaymentProviderError as e:
        db.rollback()
        raise HTTPException(502, f"Gateway error: {e}")
    audit(db, user_id=ctx.user.id, action="payment.recheck", entity_type="payment", entity_id=p.id,
          after={"outcome": outcome}, ip=ctx.ip)
    db.commit()
    notify.payment_outcome(outcome, p.id)
    return {"outcome": outcome, "payment": _payment_out(p)}
