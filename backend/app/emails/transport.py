"""Delivery backends. `smtp` (production), `file` (development: writes .eml you can open), `memory` (tests)."""
import asyncio
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from email.message import EmailMessage
from pathlib import Path

import aiosmtplib

from app.core.config import settings

log = logging.getLogger("email")
OUTBOX: list[EmailMessage] = []  # memory backend (tests)


class EmailSendError(Exception):
    def __init__(self, message: str, permanent: bool = False):
        super().__init__(message)
        self.permanent = permanent  # True = retrying will not help (e.g. mailbox does not exist)


def _run(coro):
    """Run a coroutine from sync code, even when called from inside a running event loop."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with ThreadPoolExecutor(max_workers=1) as ex:
        return ex.submit(asyncio.run, coro).result()


async def _smtp_send(msg: EmailMessage):
    await aiosmtplib.send(
        msg, hostname=settings.smtp_host, port=settings.smtp_port,
        username=settings.smtp_user or None, password=settings.smtp_password or None,
        use_tls=settings.smtp_ssl, start_tls=settings.smtp_starttls and not settings.smtp_ssl, timeout=20)


def send(msg: EmailMessage) -> None:
    backend = settings.email_backend
    if backend == "memory":
        OUTBOX.append(msg)
    elif backend == "file":
        d = Path(settings.email_outbox_dir)
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{int(time.time())}-{msg['X-Mangokili-Kind']}-{uuid.uuid4().hex[:8]}.eml").write_bytes(bytes(msg))
    elif backend == "smtp":
        if not settings.smtp_host:
            raise EmailSendError("SMTP_HOST is not configured", permanent=True)
        try:
            _run(_smtp_send(msg))
        except aiosmtplib.SMTPRecipientsRefused as e:
            raise EmailSendError(f"Recipient refused: {e}", permanent=all(500 <= r.code < 600 for r in e.recipients))
        except aiosmtplib.SMTPResponseException as e:
            raise EmailSendError(f"SMTP {e.code}: {e.message}", permanent=500 <= e.code < 600)
        except (aiosmtplib.SMTPException, OSError, asyncio.TimeoutError) as e:
            raise EmailSendError(f"SMTP connection problem: {type(e).__name__}: {e}")
    else:
        raise EmailSendError(f"Unknown EMAIL_BACKEND {backend!r}", permanent=True)
