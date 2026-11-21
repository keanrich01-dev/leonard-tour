import re
import threading
from datetime import date, timedelta
from decimal import Decimal
from email import message_from_bytes, policy

import pytest
from aiosmtpd.controller import Controller
from sqlalchemy import text

from app.core.config import settings
from app.emails import builders, transport
from app.emails.catalog import MESSAGES
from app.emails.formatting import fmt_date, fmt_money
from app.emails.service import send_kind
from app.emails.transport import EmailSendError
from app.main import app
from app.models import AuditLog, Booking, EmailLog, Payment
from app.models.enums import PaymentStatus, Role
from app.payments import get_provider
from tests.test_booking_payments import (FakeProvider, book, body, gw, ipn, pay, pkg, truth)  # noqa: F401
from tests.test_admin_security import enroll, login, staff_client
from tests.conftest import make_user

LANGS = list(MESSAGES)


def parts(msg):
    return msg.get_body(("plain",)).get_content(), msg.get_body(("html",)).get_content()


# ------------------------------------------------------------------ catalog & formatting
def test_every_language_has_every_key():
    en = MESSAGES["en"]
    for lang, m in MESSAGES.items():
        for section, keys in en.items():
            assert set(m[section]) == set(keys), (lang, section)
            assert all(isinstance(v, str) and v.strip() for v in m[section].values()), (lang, section)


def test_placeholders_match_english_in_every_language():
    ph = lambda s: sorted(re.findall(r"\{(\w+)\}", s))
    en = MESSAGES["en"]
    for lang, m in MESSAGES.items():
        for section, keys in en.items():
            for k, v in keys.items():
                assert ph(m[section][k]) == ph(v), (lang, section, k)


def test_date_and_money_formats():
    d = date(2027, 3, 5)
    assert fmt_date(d, "en") == "5 March 2027" and fmt_date(d, "sw") == "5 Machi 2027"
    assert fmt_date(d, "fr") == "5 mars 2027" and fmt_date(d, "zh") == "2027年3月5日" and fmt_date(d, "ko") == "2027년 3월 5일"
    assert fmt_money(Decimal("1250"), "USD") == "USD 1,250.00" and fmt_money(Decimal("2500000"), "TZS") == "TZS 2,500,000"


# ------------------------------------------------------------------ rendering through the full flow
@pytest.mark.parametrize("lang", LANGS)
def test_booking_created_email_in_each_language(client, pkg, gw, db, lang):
    j, _ = book(client, language=lang, customer_name="Asha Juma")
    msgs = [m for m in transport.OUTBOX if m["X-Mangokili-Kind"] == "booking_created"]
    assert len(msgs) == 1
    m = message_from_bytes(bytes(msgs[0]), policy=policy.default)
    text_part, html_part = parts(m)
    assert m["To"] == "asha@example.com" and j["reference"] in m["Subject"]
    assert "\n" not in m["Subject"]
    for body_ in (text_part, html_part):
        assert j["reference"] in body_ and "USD 2,000.00" in body_ and "USD 600.00" in body_
        assert not re.search(r"\{\w+\}|None|undefined", body_), body_[:300]
    assert f'lang="{lang}"' in html_part
    assert MESSAGES[lang]["common"]["greeting"].format(name="Asha Juma") in text_part
    assert fmt_date(date.fromisoformat(body()["travel_date"]), lang) in text_part
    assert re.search(r"/booking/MK-\d{4}-[0-9A-F]{6}#[\w-]{20,}", text_part)  # personal link with #code


def test_unknown_language_falls_back_to_english(client, pkg, gw, db):
    j, _ = book(client)
    db.execute(text("UPDATE bookings SET language='xx'"))
    db.commit()
    transport.OUTBOX.clear()
    send_kind(db, "booking_created", db.query(Booking).one().id, {"nonce": "again"})
    assert "Dear Asha Juma" in parts(transport.OUTBOX[0])[0]


def test_html_is_escaped_so_customer_input_cannot_inject_markup(client, pkg, gw, db):
    evil = '<script>alert(1)</script> & "Bobby"'
    book(client, customer_name=evil, notes="<img src=x onerror=alert(2)>")
    for m in transport.OUTBOX:
        html = m.get_body(("html",)).get_content()
        assert "<script>" not in html and "<img src=x" not in html
    admin_html = next(m for m in transport.OUTBOX if m["X-Mangokili-Kind"] == "admin_new_booking").get_body(("html",)).get_content()
    assert "&lt;img src=x onerror=alert(2)&gt;" in admin_html


def test_header_injection_is_neutralised():
    from app.emails.render import Content, render
    c = Content(subject="Hi\r\nBcc: evil@x.com", preheader="p", greeting="g", paragraphs=[], closing="c", footer="f")
    m = render(c, "a@b.co", "t").to_message()
    assert "Bcc" not in m.keys() and "\n" not in m["Subject"] and "\r" not in m["Subject"]


# ------------------------------------------------------------------ triggers
def test_booking_create_emails_customer_and_admin(client, pkg, gw):
    book(client)
    kinds = {(m["X-Mangokili-Kind"], m["To"]) for m in transport.OUTBOX}
    assert kinds == {("booking_created", "asha@example.com"), ("admin_new_booking", "boss@leonard-tour.test")}


def test_verified_payment_sends_one_receipt_even_when_notification_replayed(client, pkg, gw, db):
    j, hdr = book(client, language="fr")
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid)
    for _ in range(3):
        ipn(client, p)
    receipts = [m for m in transport.OUTBOX if m["X-Mangokili-Kind"] == "payment_received"]
    assert len(receipts) == 1
    t, h = parts(message_from_bytes(bytes(receipts[0]), policy=policy.default))
    assert "Paiement reçu" in receipts[0]["Subject"] and "USD 600.00" in t and "Votre réservation est désormais confirmée" in t
    assert "USD 1,400.00" in t  # remaining balance
    assert sum(1 for m in transport.OUTBOX if m["X-Mangokili-Kind"] == "admin_payment_paid") == 1


def test_no_receipt_when_payment_not_verified(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.pending)
    ipn(client, p)
    assert not [m for m in transport.OUTBOX if m["X-Mangokili-Kind"] in ("payment_received", "admin_payment_paid")]


def test_amount_mismatch_alerts_staff_and_not_customer(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid, amount=Decimal("1.00"))
    ipn(client, p)
    kinds = [m["X-Mangokili-Kind"] for m in transport.OUTBOX]
    assert "admin_amount_mismatch" in kinds and "payment_received" not in kinds
    alert = next(m for m in transport.OUTBOX if m["X-Mangokili-Kind"] == "admin_amount_mismatch")
    assert "ACTION NEEDED" in alert["Subject"]


def test_polling_a_paid_payment_sends_receipt(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid)
    client.get(f"/api/bookings/{j['reference']}/status", headers=hdr)
    client.get(f"/api/bookings/{j['reference']}/status", headers=hdr)
    assert sum(1 for m in transport.OUTBOX if m["X-Mangokili-Kind"] == "payment_received") == 1


def test_cancellation_emails_customer_in_their_language(client, pkg, gw, db):
    book(client, language="zh")
    staff_client(client, db, "mgr@example.com", Role.manager)
    bid = db.query(Booking).one().id
    client.patch(f"/api/admin/bookings/{bid}", json={"status": "cancelled"})
    m = next(m for m in transport.OUTBOX if m["X-Mangokili-Kind"] == "booking_cancelled")
    assert "已取消" in m["Subject"] and m["To"] == "asha@example.com"


def test_security_alerts_go_to_the_staff_member(client, db):
    make_user(db, "boss@example.com", Role.admin)
    enroll(client)
    alert = [m for m in transport.OUTBOX if m["X-Mangokili-Kind"] == "security_alert"]
    assert [a["To"] for a in alert] == ["boss@example.com"] and "Two-factor" in alert[0]["Subject"]
    client.post("/api/admin/auth/change-password", json={"current_password": "correct horse battery staple",
                                                         "new_password": "an even longer new passphrase"})
    assert any("password was changed" in a["Subject"] for a in transport.OUTBOX)


def test_lockout_alert_is_sent_once_per_hour(client, db):
    make_user(db, "boss@example.com", Role.admin)
    for _ in range(5):
        login(client, pw="wrong password here")
    from app.models import User
    db.query(User).update({"locked_until": None, "failed_logins": 0}); db.commit()
    for _ in range(5):
        login(client, pw="wrong password here")
    locks = [m for m in transport.OUTBOX if m["X-Mangokili-Kind"] == "security_alert" and "locked" in m["Subject"]]
    assert len(locks) == 1


# ------------------------------------------------------------------ delivery service
def test_email_failure_never_breaks_the_booking_request(client, pkg, gw, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("redis is down")
    import app.worker as w
    monkeypatch.setattr(w.send_email_task, "delay", boom)
    r = client.post("/api/bookings", json=body())
    assert r.status_code == 201


def test_dedupe_log_records_sent_emails(client, pkg, gw, db):
    book(client)
    rows = db.query(EmailLog).all()
    assert {r.kind for r in rows} == {"booking_created", "admin_new_booking"} and all(r.status == "sent" for r in rows)
    bid = db.query(Booking).one().id
    transport.OUTBOX.clear()
    out = send_kind(db, "booking_created", bid, {})
    assert out["sent"] == 0 and out["skipped"] == 1 and not transport.OUTBOX


def test_transient_failure_is_retried_and_sent_exactly_once(client, pkg, gw, db, monkeypatch):
    j, _ = book(client)
    db.execute(text("DELETE FROM email_log")); db.commit()
    real, calls = transport.send, {"n": 0}
    def flaky(msg):
        calls["n"] += 1
        if calls["n"] == 1:
            raise EmailSendError("connection reset")
        return real(msg)
    monkeypatch.setattr(transport, "send", flaky)
    transport.OUTBOX.clear()
    bid = db.query(Booking).one().id
    with pytest.raises(EmailSendError):
        send_kind(db, "booking_created", bid, {})
    assert db.query(EmailLog).one().status == "failed"
    assert send_kind(db, "booking_created", bid, {})["sent"] == 1
    assert len(transport.OUTBOX) == 1 and db.query(EmailLog).one().attempts == 2


def test_permanent_failure_is_not_retried(client, pkg, gw, db, monkeypatch):
    book(client)
    db.execute(text("DELETE FROM email_log")); db.commit()
    def refuse(msg):
        raise EmailSendError("550 no such mailbox", permanent=True)
    monkeypatch.setattr(transport, "send", refuse)
    bid = db.query(Booking).one().id
    out = send_kind(db, "booking_created", bid, {})   # does NOT raise -> Celery will not retry
    assert out["sent"] == 0
    row = db.query(EmailLog).one()
    assert row.status == "failed" and row.error.startswith("PERMANENT")
    monkeypatch.setattr(transport, "send", lambda m: pytest.fail("must not try again"))
    send_kind(db, "booking_created", bid, {})


def test_balance_reminder_only_for_confirmed_unpaid_trips_and_only_once(client, pkg, gw, db):
    j, hdr = book(client, travel_date=str(date.today() + timedelta(days=10)))
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid); ipn(client, p)             # deposit paid -> confirmed, balance due
    book(client, travel_date=str(date.today() + timedelta(days=10)))      # second booking: unpaid -> no reminder
    book(client, travel_date=str(date.today() + timedelta(days=90)))      # far away -> no reminder
    transport.OUTBOX.clear()
    from app.worker import balance_reminders_task
    assert balance_reminders_task() == 1
    balance_reminders_task()
    rem = [m for m in transport.OUTBOX if m["X-Mangokili-Kind"] == "balance_reminder"]
    assert len(rem) == 1 and "USD 1,400.00" in parts(rem[0])[0]


# ------------------------------------------------------------------ real SMTP on the wire
class Capture:
    def __init__(self):
        self.messages = []
    async def handle_RCPT(self, server, session, envelope, address, rcpt_options):
        if address.startswith("reject@"):
            return "550 5.1.1 No such user"
        envelope.rcpt_tos.append(address)
        return "250 OK"
    async def handle_DATA(self, server, session, envelope):
        self.messages.append(envelope.content)
        return "250 Message accepted"


@pytest.fixture()
def smtp_server(monkeypatch):
    cap = Capture()
    ctl = Controller(cap, hostname="127.0.0.1", port=8026)
    ctl.start()
    for k, v in dict(email_backend="smtp", smtp_host="127.0.0.1", smtp_port=8026, smtp_starttls=False,
                     smtp_ssl=False, smtp_user="", smtp_password="").items():
        monkeypatch.setattr(settings, k, v)
    yield cap
    ctl.stop()


def _msg(to="asha@example.com", lang="ko"):
    from app.emails.render import Content, render
    c = Content(subject=f"예약 확인 – {lang}", preheader="p", greeting="김민수님께,", paragraphs=["안녕하세요"], closing="팀",
                footer="f", lang=lang, rows=[("예약 번호", "MK-1")])
    return render(c, to, "booking_created").to_message()


def test_real_smtp_delivery_with_unicode_multipart(smtp_server):
    transport.send(_msg())
    assert len(smtp_server.messages) == 1
    m = message_from_bytes(smtp_server.messages[0], policy=policy.default)
    assert m["Subject"] == "예약 확인 – ko" and m["Auto-Submitted"] == "auto-generated"
    assert "김민수님께," in m.get_body(("plain",)).get_content() and "MK-1" in m.get_body(("html",)).get_content()


def test_real_smtp_permanent_vs_transient_errors(smtp_server, monkeypatch):
    with pytest.raises(EmailSendError) as e:
        transport.send(_msg(to="reject@example.com"))
    assert e.value.permanent
    monkeypatch.setattr(settings, "smtp_port", 8999)   # nothing listens here
    with pytest.raises(EmailSendError) as e2:
        transport.send(_msg())
    assert not e2.value.permanent


def test_smtp_works_when_called_inside_a_running_event_loop(smtp_server):
    import asyncio
    async def inside():
        transport.send(_msg())
    asyncio.run(inside())
    assert len(smtp_server.messages) == 1


def test_file_backend_writes_openable_eml(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "email_backend", "file")
    monkeypatch.setattr(settings, "email_outbox_dir", str(tmp_path))
    transport.send(_msg())
    files = list(tmp_path.glob("*.eml"))
    assert len(files) == 1 and "예약 확인" in message_from_bytes(files[0].read_bytes(), policy=policy.default)["Subject"]
