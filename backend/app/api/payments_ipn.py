import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Payment
from app.payments import get_provider
from app.payments.base import PaymentProvider, PaymentProviderError
from app.services import notify
from app.services.audit import audit
from app.services.payments import verify_payment

router = APIRouter(prefix="/api/payments", tags=["payments"])
log = logging.getLogger("ipn")


@router.api_route("/pesapal/ipn", methods=["GET", "POST"])
async def pesapal_ipn(request: Request, db: Session = Depends(get_db),
                      provider: PaymentProvider = Depends(get_provider)):
    """Pesapal IPN. The notification itself proves nothing: we only use it to know WHICH payment to
    re-check, then ask Pesapal (authenticated) for the real status."""
    params = dict(request.query_params)
    if request.method == "POST":
        try:
            body = await request.json()
            if isinstance(body, dict):
                params.update({k: str(v) for k, v in body.items()})
        except ValueError:
            pass
    try:
        n = provider.parse_notification(params)
    except PaymentProviderError:
        raise HTTPException(400, "Malformed notification")
    # Match on BOTH our merchant reference and the gateway's tracking id we stored at checkout.
    pay = db.scalar(select(Payment).where(Payment.merchant_reference == n.merchant_reference,
                                          Payment.provider_reference == n.provider_reference).with_for_update())
    ack = {"orderNotificationType": params.get("OrderNotificationType", "IPNCHANGE"),
           "orderTrackingId": n.provider_reference, "orderMerchantReference": n.merchant_reference, "status": 200}
    if pay is None:
        log.warning("IPN for unknown payment %s", n.merchant_reference)
        return ack  # acknowledge so the gateway stops retrying; nothing is changed
    try:
        outcome = verify_payment(db, pay, provider, "ipn")
    except PaymentProviderError as e:
        db.rollback()
        log.error("IPN status check failed: %s", e)
        raise HTTPException(503, "Status check failed; please retry")  # gateway will re-send
    db.commit()
    notify.payment_outcome(outcome, pay.id)
    log.info("IPN %s -> %s", n.merchant_reference, outcome)
    return ack
