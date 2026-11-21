"""Celery app. Run:  celery -A app.worker.celery_app worker -B -l info"""
import logging
from datetime import date, timedelta

from celery import Celery
from celery.schedules import crontab
from sqlalchemy import select

from app.core.config import settings
from app.core.db import SessionLocal
from app.emails.service import send_kind
from app.emails.transport import EmailSendError

log = logging.getLogger("worker")

celery_app = Celery("mangokili", broker=settings.redis_url)
celery_app.conf.update(
    task_always_eager=settings.celery_eager, task_eager_propagates=settings.celery_eager,
    task_acks_late=True, worker_prefetch_multiplier=1, task_ignore_result=True, timezone="UTC",
    broker_connection_retry_on_startup=True,
    beat_schedule={"balance-reminders": {"task": "mangokili.balance_reminders", "schedule": crontab(hour=5, minute=0)}},  # 08:00 East Africa
)


@celery_app.task(bind=True, name="mangokili.send_email", autoretry_for=(EmailSendError,),
                 retry_backoff=30, retry_backoff_max=1800, retry_jitter=True, max_retries=6)
def send_email_task(self, kind: str, entity_id: int, extra: dict | None = None):
    with SessionLocal() as db:
        return send_kind(db, kind, entity_id, extra)


@celery_app.task(name="mangokili.balance_reminders")
def balance_reminders_task():
    """Daily: confirmed bookings travelling within N days that still owe money get ONE reminder (EmailLog dedupes)."""
    from app.models import Booking
    from app.models.enums import BookingStatus
    today = date.today()
    horizon = today + timedelta(days=settings.balance_reminder_days)
    with SessionLocal() as db:
        ids = db.scalars(select(Booking.id).where(Booking.status == BookingStatus.confirmed,
                                                  Booking.travel_date >= today, Booking.travel_date <= horizon)).all()
    for i in ids:
        send_email_task.delay("balance_reminder", i, {})
    return len(ids)
