"""PesapalProvider against a mock that mimics Pesapal API 3.0 request/response shapes."""
import json
from decimal import Decimal

import httpx
import pytest

from app.models.enums import PaymentStatus
from app.payments.base import PaymentProviderError
from app.payments.pesapal import PesapalProvider


class FakePesapal:
    def __init__(self):
        self.calls, self.status_code, self.amount, self.currency = [], 1, 100, "TZS"
        self.token_n = 0
        self.fail_auth = False
        self.reject_first_token = False
        self.raw_status = None

    def __call__(self, req: httpx.Request) -> httpx.Response:
        path = req.url.path
        body = json.loads(req.content) if req.content else None
        self.calls.append((req.method, path, body, req.headers.get("authorization")))
        if path.endswith("/Auth/RequestToken"):
            if self.fail_auth:
                return httpx.Response(200, json={"error": {"message": "invalid_consumer_key_or_secret_provided"}, "status": "500"})
            self.token_n += 1
            return httpx.Response(200, json={"token": f"tok{self.token_n}", "expiryDate": "2099-01-01T00:00:00Z", "status": "200"})
        if self.reject_first_token and req.headers.get("authorization") == "Bearer tok1":
            return httpx.Response(401, json={})
        if path.endswith("/URLSetup/RegisterIPN"):
            return httpx.Response(200, json={"ipn_id": "ipn-123", "url": body["url"], "status": "200"})
        if path.endswith("/Transactions/SubmitOrderRequest"):
            return httpx.Response(200, json={"order_tracking_id": "trk-1", "merchant_reference": body["id"],
                                             "redirect_url": "https://pay.example/checkout/trk-1", "status": "200"})
        if path.endswith("/Transactions/GetTransactionStatus"):
            if self.raw_status is not None:
                return httpx.Response(200, json=self.raw_status)
            label = {0: "INVALID", 1: "COMPLETED", 2: "FAILED", 3: "REVERSED"}[self.status_code]
            return httpx.Response(200, json={"status_code": self.status_code, "payment_status_description": label,
                                             "amount": self.amount, "currency": self.currency,
                                             "merchant_reference": "REF-1", "payment_method": "MpesaTZ", "status": "200"})
        return httpx.Response(404)


@pytest.fixture()
def fake():
    return FakePesapal()


@pytest.fixture()
def prov(fake):
    return PesapalProvider("key", "secret", "https://sandbox.example/pesapalv3", transport=httpx.MockTransport(fake))


def checkout(prov):
    return prov.create_checkout(merchant_reference="REF-1", amount=Decimal("100"), currency="TZS",
                                customer_email="a@b.co", customer_phone="0712345678", customer_name="Asha Juma",
                                country="TZ", description="Test", callback_url="https://f/cb", ipn_url="https://api/ipn")


def test_checkout_sends_documented_fields_and_returns_redirect(prov, fake):
    s = checkout(prov)
    assert s.provider_reference == "trk-1" and s.redirect_url.startswith("https://pay.example/")
    method, path, body, auth = fake.calls[-1]
    assert path == "/pesapalv3/api/Transactions/SubmitOrderRequest" and auth == "Bearer tok1"
    assert body["notification_id"] == "ipn-123" and body["id"] == "REF-1" and body["currency"] == "TZS"
    assert body["billing_address"]["first_name"] == "Asha" and body["billing_address"]["last_name"] == "Juma"


def test_token_and_ipn_are_cached(prov, fake):
    checkout(prov); checkout(prov)
    paths = [c[1].rsplit("/", 1)[-1] for c in fake.calls]
    assert paths.count("RequestToken") == 1 and paths.count("RegisterIPN") == 1


def test_expired_token_is_refreshed_once(prov, fake):
    prov._auth_token()
    fake.reject_first_token = True
    s = checkout(prov)
    assert s.provider_reference == "trk-1" and fake.token_n == 2


def test_bad_credentials_raise_clean_error(fake):
    fake.fail_auth = True
    p = PesapalProvider("bad", "bad", "https://sandbox.example/pesapalv3", transport=httpx.MockTransport(fake))
    with pytest.raises(PaymentProviderError, match="invalid_consumer_key"):
        checkout(p)


def test_missing_credentials_refused():
    with pytest.raises(PaymentProviderError):
        PesapalProvider("", "", "https://x")


@pytest.mark.parametrize("code,expected", [(1, PaymentStatus.paid), (2, PaymentStatus.failed),
                                            (3, PaymentStatus.refunded), (0, PaymentStatus.pending)])
def test_status_mapping(prov, fake, code, expected):
    fake.status_code = code
    assert prov.fetch_status("trk-1").status == expected  # INVALID(0) is never treated as failure


def test_status_returns_exact_decimal_amount(prov, fake):
    fake.amount = 1500.5
    assert prov.fetch_status("trk-1").amount == Decimal("1500.5")


def test_notification_parsing_is_case_insensitive(prov):
    n = prov.parse_notification({"OrderTrackingId": "t", "OrderMerchantReference": "m", "OrderNotificationType": "IPNCHANGE"})
    assert (n.provider_reference, n.merchant_reference) == ("t", "m")
    with pytest.raises(PaymentProviderError):
        prov.parse_notification({"foo": "bar"})


# Captured from the REAL Pesapal sandbox (Tanzania merchant) for an order that was created but not yet paid.
REAL_UNPAID = {"payment_method": "", "amount": 1000.0, "created_date": "2026-11-08T17:40:41.8", "confirmation_code": "",
               "order_tracking_id": "67e6357c-ac39-4da6-8289-d9b06e4ac27e", "payment_status_description": "INVALID",
               "description": None, "message": "Request processed successfully", "payment_account": "",
               "status_code": 0, "merchant_reference": "SMOKE-42248FB784", "account_number": None,
               "payment_status_code": "", "currency": "TZS",
               "error": {"error_type": "api_error", "code": "payment_details_not_found", "message": "Pending Payment"},
               "status": "500"}


def test_real_unpaid_response_is_pending_not_an_error(prov, fake):
    fake.raw_status = REAL_UNPAID
    v = prov.fetch_status("67e6357c-ac39-4da6-8289-d9b06e4ac27e")
    assert v.status == PaymentStatus.pending and v.merchant_reference == "SMOKE-42248FB784"
    assert v.amount == Decimal("1000.0") and v.currency == "TZS" and v.method is None


def test_paid_requires_code_and_label_to_agree(prov, fake):
    fake.raw_status = {**REAL_UNPAID, "status_code": 1, "payment_status_description": "INVALID", "error": None}
    assert prov.fetch_status("x").status == PaymentStatus.pending      # code says paid, label does not -> not paid
    fake.raw_status = {**REAL_UNPAID, "status_code": 1, "payment_status_description": "Completed", "error": None}
    assert prov.fetch_status("x").status == PaymentStatus.paid


def test_status_error_without_transaction_is_a_real_error(prov, fake):
    fake.raw_status = {"error": {"code": "order_not_found", "message": "Order not found"}, "status": "500"}
    with pytest.raises(PaymentProviderError, match="Order not found"):
        prov.fetch_status("unknown")


# Captured from the REAL Pesapal sandbox after a successful Visa test payment (TZS 1000).
# Note: even on success the `error` object is present, with every field null.
REAL_PAID = {"payment_method": "Visa", "amount": 1000.0, "created_date": "2026-11-09T06:07:06.14",
             "confirmation_code": "7941936245646008504005",
             "order_tracking_id": "67e6357c-ac39-4da6-8289-d9b06e4ac27e",
             "payment_status_description": "Completed", "description": "Transaction successfully processed.",
             "message": "Request processed successfully", "payment_account": "411111XXXXXX1111",
             "status_code": 1, "merchant_reference": "SMOKE-42248FB784", "account_number": None,
             "payment_status_code": "", "currency": "TZS",
             "error": {"error_type": None, "code": None, "message": None}, "status": "200"}


def test_real_paid_response_is_paid_with_exact_amount_and_card_method(prov, fake):
    from app.services.payments import classify_method
    fake.raw_status = REAL_PAID
    v = prov.fetch_status("67e6357c-ac39-4da6-8289-d9b06e4ac27e")
    assert v.status == PaymentStatus.paid
    assert v.amount == Decimal("1000.00") and v.currency == "TZS"   # 1000.0 from Pesapal == 1000.00 we stored
    assert v.merchant_reference == "SMOKE-42248FB784"
    assert classify_method(v.method).value == "card"
