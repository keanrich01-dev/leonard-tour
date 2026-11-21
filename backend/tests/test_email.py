"""Email templates render in all five languages without raising."""
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.models.enums import LANGUAGES
from app.services import email as email_svc


def _fake_booking(lang: str = "en"):
    return SimpleNamespace(
        id=1,
        reference="MK-2026-ABC123",
        package_id=7,
        customer_name="Amina Juma",
        customer_email="amina@example.com",
        customer_phone="+255700000000",
        language=lang,
        travel_date=date(2026, 8, 12),
        adults=2,
        children=1,
        currency="USD",
        total_amount=Decimal("2400.00"),
        deposit_amount=Decimal("720.00"),
        status=SimpleNamespace(value="pending"),
    )


def _fake_db(title: str = "Serengeti Classic Safari"):
    db = MagicMock()
    db.scalar.return_value = SimpleNamespace(title=title)
    db.get.return_value = SimpleNamespace(slug="serengeti-classic")
    return db


@pytest.mark.parametrize("lang", LANGUAGES)
def test_booking_received_renders(lang, monkeypatch):
    sent = {}

    def capture(**kw):
        sent.update(kw)
        return True

    monkeypatch.setattr(email_svc, "send_email", capture)
    b = _fake_booking(lang)
    email_svc.send_booking_received(_fake_db(), b, access_token="tok_test_xyz")
    assert sent["to"] == b.customer_email
    assert b.reference in sent["subject"]
    assert "tok_test_xyz" in sent["html"]
    assert b.reference in sent["text"]
    assert "Serengeti" in sent["html"]


@pytest.mark.parametrize("lang", LANGUAGES)
def test_payment_confirmed_renders(lang, monkeypatch):
    sent = {}
    monkeypatch.setattr(email_svc, "send_email", lambda **kw: sent.update(kw) or True)
    b = _fake_booking(lang)
    b.status = SimpleNamespace(value="confirmed")
    pay = SimpleNamespace(amount=Decimal("720.00"), currency="USD", kind=SimpleNamespace(value="deposit"))
    email_svc.send_payment_confirmed(_fake_db(), b, pay)
    assert sent["to"] == b.customer_email
    assert "720" in sent["html"]
    assert b.reference in sent["subject"]


@pytest.mark.parametrize("lang", LANGUAGES)
def test_cancelled_renders(lang, monkeypatch):
    sent = {}
    monkeypatch.setattr(email_svc, "send_email", lambda **kw: sent.update(kw) or True)
    b = _fake_booking(lang)
    email_svc.send_booking_cancelled(_fake_db(), b)
    assert sent["to"] == b.customer_email
    assert b.reference in sent["subject"]


def test_unknown_lang_falls_back_to_en(monkeypatch):
    sent = {}
    monkeypatch.setattr(email_svc, "send_email", lambda **kw: sent.update(kw) or True)
    b = _fake_booking("xx")  # invalid
    email_svc.send_booking_received(_fake_db(), b, "tok")
    # English subject pattern
    assert "Booking received" in sent["subject"]
