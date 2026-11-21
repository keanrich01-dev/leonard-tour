"""The ONLY place where a payment may become 'paid'. Inputs must come from provider.fetch_status()."""
import logging
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Booking, Payment, PaymentEvent
from app.models.enums import BookingStatus, PaymentMethod, PaymentStatus
from app.payments.base import VerifiedPayment
from app.services.audit import audit

log = logging.getLogger("payments")


def classify_method(label: str | None) -> PaymentMethod | None:
    l = (label or "").lower()
    if any(k in l for k in ("visa", "master", "card", "amex")):
        return PaymentMethod.card
    if any(k in l for k in ("mpesa", "m-pesa", "airtel", "tigo", "mixx", "halo", "yas", "vodacom", "mobile", "mtn")):
        return PaymentMethod.mobile_money
    return None


def paid_total(db: Session, booking_id: int) -> Decimal:
    return db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(
        Payment.booking_id == booking_id, Payment.status == PaymentStatus.paid)) or Decimal(0)


def record_event(db: Session, payment: Payment, v: VerifiedPayment, source: str, signature_valid: bool = True):
    """Append-only log; identical repeats are ignored (idempotency)."""
    code = (v.raw or {}).get("status_code")
    event_id = f"{v.provider_reference}:{code}:{v.status.value}"
    try:
        with db.begin_nested():
            db.add(PaymentEvent(payment_id=payment.id, provider=payment.provider, event_id=event_id,
                                event_type=f"{source}:{v.status.value}", payload=v.raw or {},
                                signature_valid=signature_valid, processed=True))
    except IntegrityError:
        pass


def apply_verified(db: Session, payment: Payment, v: VerifiedPayment) -> str:
    """Returns an outcome label. Caller must hold a row lock on `payment` and commit."""
    if v.merchant_reference != payment.merchant_reference or v.provider_reference != payment.provider_reference:
        audit(db, user_id=None, action="payment.reference_mismatch", entity_type="payment", entity_id=payment.id)
        return "reference_mismatch"

    if v.status == PaymentStatus.paid:
        if v.amount != payment.amount or v.currency != payment.currency:
            # Customer paid something different from what we asked: never auto-confirm, a human must look.
            audit(db, user_id=None, action="payment.amount_mismatch", entity_type="payment", entity_id=payment.id,
                  after={"expected": f"{payment.amount} {payment.currency}", "received": f"{v.amount} {v.currency}"})
            log.error("Amount mismatch on payment %s", payment.id)
            return "amount_mismatch"
        if payment.status == PaymentStatus.paid:
            return "already_paid"
        payment.status = PaymentStatus.paid
        payment.verified_with_provider = True
        payment.paid_at = datetime.now(timezone.utc)
        payment.method = payment.method or classify_method(v.method)
        booking = db.get(Booking, payment.booking_id)
        if booking.status == BookingStatus.pending and paid_total(db, booking.id) + payment.amount >= booking.deposit_amount:
            booking.status = BookingStatus.confirmed
        audit(db, user_id=None, action="payment.paid", entity_type="payment", entity_id=payment.id,
              after={"booking": booking.reference, "amount": str(payment.amount), "currency": payment.currency})
        return "paid"

    if v.status == PaymentStatus.failed:
        if payment.status == PaymentStatus.pending:  # a paid payment is never downgraded to failed
            payment.status = PaymentStatus.failed
            audit(db, user_id=None, action="payment.failed", entity_type="payment", entity_id=payment.id)
            return "failed"
        return "ignored"

    if v.status == PaymentStatus.refunded:
        if payment.status == PaymentStatus.paid:
            payment.status = PaymentStatus.refunded
            audit(db, user_id=None, action="payment.reversed_by_provider", entity_type="payment",
                  entity_id=payment.id)
            return "refunded"
        return "ignored"
    return "pending"


def verify_payment(db: Session, payment: Payment, provider, source: str) -> str:
    """Ask the gateway, log the answer, apply it. Used by IPN, customer polling and admin re-check."""
    v = provider.fetch_status(payment.provider_reference)
    record_event(db, payment, v, source)
    return apply_verified(db, payment, v)
