import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.emails import transport
from app.emails.builders import BUILDERS
from app.emails.transport import EmailSendError
from app.models import EmailLog

log = logging.getLogger("email")


def _get_or_create_log(db: Session, key: str, em) -> EmailLog:
    row = db.scalar(select(EmailLog).where(EmailLog.dedupe_key == key))
    if row:
        return row
    row = EmailLog(dedupe_key=key, kind=em.kind, to_email=em.to, language=em.lang, subject=em.subject[:300])
    try:
        with db.begin_nested():
            db.add(row)
        db.commit()
        return row
    except IntegrityError:  # another worker created it first
        db.rollback()
        return db.scalar(select(EmailLog).where(EmailLog.dedupe_key == key))


def send_kind(db: Session, kind: str, entity_id: int, extra: dict | None = None) -> dict:
    """Build and deliver one kind of email. Safe to call repeatedly: each recipient gets it at most once.
    Raises EmailSendError only if a *retryable* failure happened (so Celery retries; sent ones are skipped)."""
    extra = extra or {}
    emails = BUILDERS[kind](db, entity_id, extra)
    sent = skipped = 0
    retryable: list[str] = []
    for em in emails:
        key = f"{kind}:{entity_id}:{extra.get('nonce', '')}:{em.to}"
        row = _get_or_create_log(db, key, em)
        if row.status == "sent" or (row.status == "failed" and row.error and row.error.startswith("PERMANENT")):
            skipped += 1
            continue
        row.attempts += 1
        try:
            transport.send(em.to_message())
            row.status, row.error, row.sent_at = "sent", None, datetime.now(timezone.utc)
            sent += 1
        except EmailSendError as e:
            row.status = "failed"
            row.error = (("PERMANENT: " if e.permanent else "") + str(e))[:1000]
            if e.permanent:
                log.error("Email %s to %s failed permanently: %s", kind, em.to, e)
            else:
                retryable.append(str(e))
        db.commit()
    if retryable:
        raise EmailSendError("; ".join(retryable))
    return {"sent": sent, "skipped": skipped, "recipients": len(emails)}
