"""Fire-and-forget email triggers. A broker/e-mail problem must NEVER break a booking or payment request."""
import logging
import uuid

log = logging.getLogger("notify")


def enqueue_email(kind: str, entity_id: int, extra: dict | None = None) -> None:
    try:
        from app.worker import send_email_task
        send_email_task.delay(kind, entity_id, extra or {})
    except Exception:
        log.exception("Could not queue email %s for %s", kind, entity_id)


def payment_outcome(outcome: str, payment_id: int) -> None:
    if outcome == "paid":
        enqueue_email("payment_received", payment_id)
        enqueue_email("admin_payment_paid", payment_id)
    elif outcome == "amount_mismatch":
        enqueue_email("admin_amount_mismatch", payment_id)


def security_alert(user_id: int, event: str, unique: bool = True, bucket: str = "") -> None:
    """unique=True: every occurrence mails. For noisy events pass a time `bucket` so at most one mail per bucket."""
    nonce = bucket or (uuid.uuid4().hex if unique else "")
    enqueue_email("security_alert", user_id, {"event": event, "nonce": f"{event}-{nonce}"})
