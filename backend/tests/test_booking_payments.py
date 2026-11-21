from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import text

from app.main import app
from app.models import AuditLog, Booking, Payment, PaymentEvent
from app.models.enums import PaymentStatus, Role
from app.payments import get_provider
from app.payments.base import (CheckoutSession, Notification, PaymentProvider, PaymentProviderError,
                               VerifiedPayment)
from tests.conftest import make_user
from tests.test_admin_security import enroll, login, staff_client


class FakeProvider(PaymentProvider):
    """Stands in for the gateway. `truth` is what the gateway would answer to a status query."""
    name = "pesapal"

    def __init__(self):
        self.truth: dict | None = None
        self.checkout_fails = False
        self.created = []

    def create_checkout(self, **kw):
        if self.checkout_fails:
            raise PaymentProviderError("boom")
        self.created.append(kw)
        return CheckoutSession(provider_reference=f"trk-{len(self.created)}", redirect_url="https://pay.example/x")

    def parse_notification(self, params):
        return Notification(params["OrderMerchantReference"], params["OrderTrackingId"])

    def fetch_status(self, ref):
        if self.truth is None:
            raise PaymentProviderError("gateway down")
        t = self.truth
        return VerifiedPayment(merchant_reference=t["merchant_reference"], provider_reference=ref, status=t["status"],
                               amount=Decimal(str(t["amount"])), currency=t["currency"], method=t.get("method", "MpesaTZ"),
                               raw={"status_code": {"paid": 1, "failed": 2, "refunded": 3}.get(t["status"].value, 0)})


@pytest.fixture()
def gw():
    g = FakeProvider()
    app.dependency_overrides[get_provider] = lambda: g
    yield g
    app.dependency_overrides.pop(get_provider, None)


@pytest.fixture()
def pkg(db):
    db.execute(text("INSERT INTO packages(slug,category,type,duration_days,gallery_images,is_published,sort_order,"
                    "price_from_usd,price_from_tzs) VALUES ('safari-a','safari','luxury',5,'[]',true,0,1000,2500000)"))
    db.execute(text("INSERT INTO packages(slug,category,type,duration_days,gallery_images,is_published,sort_order,"
                    "price_from_usd) VALUES ('usd-only','safari','luxury',5,'[]',true,1,500)"))
    db.commit()


def body(**over):
    d = dict(package_slug="safari-a", travel_date=str(date.today() + timedelta(days=30)), adults=2, children=0,
             currency="USD", customer_name="Asha Juma", customer_email="asha@example.com", country="TZ", language="en")
    d.update(over)
    return d


def book(client, **over):
    r = client.post("/api/bookings", json=body(**over))
    assert r.status_code == 201, r.text
    j = r.json()
    return j, {"X-Booking-Token": j["access_token"]}


def pay(client, ref, hdr, kind="deposit"):
    return client.post(f"/api/bookings/{ref}/pay", json={"kind": kind}, headers=hdr)


def ipn(client, p: Payment):
    return client.get("/api/payments/pesapal/ipn", params={"OrderTrackingId": p.provider_reference,
                                                           "OrderMerchantReference": p.merchant_reference,
                                                           "OrderNotificationType": "IPNCHANGE"})


def truth(p: Payment, status, amount=None, currency=None):
    return {"merchant_reference": p.merchant_reference, "status": status,
            "amount": amount if amount is not None else p.amount, "currency": currency or p.currency}


# ---------------- pricing & creation ----------------
def test_quote_is_server_side_and_deposit_is_percentage(client, pkg, gw):
    j, _ = book(client, adults=2, children=1)
    assert j["total"] == "3000.00" and j["deposit"] == "900.00" and j["status"] == "pending"  # 30% default


def test_tzs_uses_its_own_price_no_exchange_rate(client, pkg, gw):
    j, _ = book(client, currency="TZS")
    assert j["total"] == "5000000" and j["currency"] == "TZS"
    r = client.post("/api/bookings", json=body(package_slug="usd-only", currency="TZS"))
    assert r.status_code == 422 and "not priced in TZS" in r.text


@pytest.mark.parametrize("over,code", [(dict(travel_date=str(date.today())), 422), (dict(adults=0), 422),
                                       (dict(adults=25, children=10), 422), (dict(language="xx"), 422),
                                       (dict(currency="EUR"), 422), (dict(package_slug="nope"), 404),
                                       (dict(customer_email="not-an-email"), 422)])
def test_booking_validation(client, pkg, gw, over, code):
    assert client.post("/api/bookings", json=body(**over)).status_code == code


def test_booking_access_needs_token_and_errors_are_uniform(client, pkg, gw):
    j, hdr = book(client)
    assert client.get(f"/api/bookings/{j['reference']}", headers=hdr).status_code == 200
    a = client.get(f"/api/bookings/{j['reference']}", headers={"X-Booking-Token": "wrong"})
    b = client.get("/api/bookings/MK-2026-NOPE00", headers=hdr)
    assert a.status_code == b.status_code == 404 and a.json() == b.json()
    assert client.get(f"/api/bookings/{j['reference']}").status_code == 404


def test_booking_creation_rate_limited(client, pkg, gw):
    codes = [client.post("/api/bookings", json=body()).status_code for _ in range(12)]
    assert codes[:10] == [201] * 10 and codes[10] == 429


# ---------------- starting a payment ----------------
def test_pay_uses_server_amount_and_ignores_client_amount(client, pkg, gw, db):
    j, hdr = book(client)
    r = client.post(f"/api/bookings/{j['reference']}/pay", json={"kind": "deposit", "amount": 1}, headers=hdr)
    assert r.status_code == 200 and r.json()["amount"] == "600.00"
    assert gw.created[0]["amount"] == Decimal("600.00")
    p = db.query(Payment).one()
    assert p.status == PaymentStatus.pending and p.provider_reference == "trk-1"


def test_pay_requires_token(client, pkg, gw):
    j, _ = book(client)
    assert pay(client, j["reference"], {}).status_code == 404


def test_gateway_outage_marks_attempt_failed_and_hides_details(client, pkg, gw, db):
    j, hdr = book(client)
    gw.checkout_fails = True
    r = pay(client, j["reference"], hdr)
    assert r.status_code == 502 and "boom" not in r.text
    assert db.query(Payment).one().status == PaymentStatus.failed


def test_cannot_pay_deposit_twice_and_balance_before_deposit(client, pkg, gw, db):
    j, hdr = book(client)
    assert pay(client, j["reference"], hdr, "balance").status_code == 409
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid)
    ipn(client, p)
    assert pay(client, j["reference"], hdr, "deposit").status_code == 409
    r = pay(client, j["reference"], hdr, "balance")
    assert r.status_code == 200 and r.json()["amount"] == "1400.00"


# ---------------- the core rule: only a verified gateway answer can mark paid ----------------
def test_ipn_alone_never_marks_paid_when_gateway_says_pending(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.pending)
    assert ipn(client, p).status_code == 200
    db.refresh(p)
    assert p.status == PaymentStatus.pending and not p.verified_with_provider


def test_forged_ipn_with_wrong_tracking_id_changes_nothing(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid)
    r = client.get("/api/payments/pesapal/ipn", params={"OrderTrackingId": "attacker", "OrderMerchantReference": p.merchant_reference})
    assert r.status_code == 200
    db.refresh(p)
    assert p.status == PaymentStatus.pending


def test_ipn_unknown_reference_is_acknowledged_without_effect(client, pkg, gw):
    r = client.get("/api/payments/pesapal/ipn", params={"OrderTrackingId": "x", "OrderMerchantReference": "nope"})
    assert r.status_code == 200 and r.json()["status"] == 200


def test_malformed_ipn_rejected(client, gw):
    class P(FakeProvider):
        def parse_notification(self, params):
            raise PaymentProviderError("bad")
    app.dependency_overrides[get_provider] = lambda: P()
    assert client.get("/api/payments/pesapal/ipn").status_code == 400


def test_verified_payment_marks_paid_and_confirms_booking(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid)
    assert ipn(client, p).status_code == 200
    db.refresh(p)
    b = db.query(Booking).one()
    db.refresh(b)
    assert p.status == PaymentStatus.paid and p.verified_with_provider and p.paid_at and p.method.value == "mobile_money"
    assert b.status.value == "confirmed"
    assert db.query(PaymentEvent).count() == 1
    assert "payment.paid" in {a.action for a in db.query(AuditLog)}


def test_replayed_ipn_is_idempotent(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid)
    for _ in range(3):
        assert ipn(client, p).status_code == 200
    assert db.query(PaymentEvent).count() == 1
    assert db.query(AuditLog).filter_by(action="payment.paid").count() == 1


def test_amount_mismatch_is_not_confirmed_and_is_flagged(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid, amount=Decimal("1.00"))
    ipn(client, p)
    db.refresh(p)
    assert p.status == PaymentStatus.pending
    assert "payment.amount_mismatch" in {a.action for a in db.query(AuditLog)}


def test_currency_mismatch_not_confirmed(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid, currency="TZS")
    ipn(client, p)
    db.refresh(p)
    assert p.status == PaymentStatus.pending


def test_paid_is_never_downgraded_to_failed(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid); ipn(client, p)
    gw.truth = truth(p, PaymentStatus.failed); ipn(client, p)
    db.refresh(p)
    assert p.status == PaymentStatus.paid


def test_failed_payment_leaves_booking_pending_and_allows_retry(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.failed); ipn(client, p)
    db.refresh(p)
    assert p.status == PaymentStatus.failed
    assert client.get(f"/api/bookings/{j['reference']}", headers=hdr).json()["status"] == "pending"
    assert pay(client, j["reference"], hdr).status_code == 200  # customer can try again


def test_gateway_down_during_ipn_asks_for_retry_without_changes(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = None
    assert ipn(client, p).status_code == 503
    db.refresh(p)
    assert p.status == PaymentStatus.pending


def test_polling_status_verifies_with_gateway(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid)   # IPN never arrived (e.g. localhost): polling still works
    r = client.get(f"/api/bookings/{j['reference']}/status", headers=hdr)
    assert r.json()["status"] == "confirmed" and r.json()["paid"] == "600.00"


def test_full_payment_flow_two_steps_to_fully_paid(client, pkg, gw, db):
    j, hdr = book(client)
    ref = j["reference"]
    for kind in ("deposit", "balance"):
        pay(client, ref, hdr, kind)
        p = db.query(Payment).order_by(Payment.id.desc()).first()
        gw.truth = truth(p, PaymentStatus.paid); ipn(client, p)
    st = client.get(f"/api/bookings/{ref}", headers=hdr).json()
    assert st["paid"] == "2000.00" and st["balance_due"] == "0.00"
    assert pay(client, ref, hdr, "full").status_code == 409


# ---------------- admin side ----------------
def test_admin_permissions_for_bookings_and_payments(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    staff_client(client, db, "officer@example.com", Role.booking_officer)
    assert client.get("/api/admin/bookings").status_code == 200
    assert client.get("/api/admin/payments").status_code == 403      # officers don't see money
    staff_client(client, db, "fin@example.com", Role.finance)
    assert client.get("/api/admin/payments").status_code == 200
    bid = db.query(Booking).one().id
    assert client.patch(f"/api/admin/bookings/{bid}", json={"status": "cancelled"}).status_code == 403


def test_admin_booking_status_rules_and_audit(client, pkg, gw, db):
    j, hdr = book(client)
    staff_client(client, db, "mgr@example.com", Role.manager)
    bid = db.query(Booking).one().id
    assert client.patch(f"/api/admin/bookings/{bid}", json={"status": "completed"}).status_code == 409
    assert client.patch(f"/api/admin/bookings/{bid}", json={"status": "cancelled"}).status_code == 200
    assert client.patch(f"/api/admin/bookings/{bid}", json={"status": "confirmed"}).status_code == 409
    assert db.query(AuditLog).filter_by(action="booking.update").count() == 1
    assert pay(client, j["reference"], hdr).status_code == 409   # cancelled bookings can't be paid


def test_cancelling_paid_booking_warns_about_refund(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid); ipn(client, p)
    staff_client(client, db, "mgr@example.com", Role.manager)
    r = client.patch(f"/api/admin/bookings/{db.query(Booking).one().id}", json={"status": "cancelled"})
    assert "refund" in r.json()["warning"].lower()


def test_admin_recheck_resolves_stuck_payment_and_is_audited(client, pkg, gw, db):
    j, hdr = book(client)
    pay(client, j["reference"], hdr)
    p = db.query(Payment).one()
    gw.truth = truth(p, PaymentStatus.paid)
    staff_client(client, db, "fin@example.com", Role.finance)
    r = client.post(f"/api/admin/payments/{p.id}/recheck")
    assert r.status_code == 200 and r.json()["outcome"] == "paid"
    assert db.query(AuditLog).filter_by(action="payment.recheck").count() == 1


def test_no_endpoint_edits_or_deletes_payments(client):
    paths = {(m, r.path) for r in app.routes if hasattr(r, "path") for m in getattr(r, "methods", [])}
    from fastapi.routing import APIRoute
    all_routes = []
    def walk(rs):
        for r in rs:
            if isinstance(r, APIRoute): all_routes.append(r)
    walk(app.routes)
    for r in app.routes:
        sub = getattr(getattr(r, "original_router", None), "routes", [])
        walk(sub)
    bad = [(m, r.path) for r in all_routes if "payment" in r.path for m in r.methods if m in ("PUT", "PATCH", "DELETE")]
    assert bad == []
