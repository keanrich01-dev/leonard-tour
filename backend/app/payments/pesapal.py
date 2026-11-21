"""Pesapal API 3.0 adapter (https://developer.pesapal.com).

Flow: RequestToken -> RegisterIPN (once per URL) -> SubmitOrderRequest (get redirect_url)
      -> customer pays on Pesapal -> IPN hits us -> we call GetTransactionStatus -> only then mark paid.
"""
import threading
import time
from datetime import datetime, timezone
from decimal import Decimal

import httpx

from app.models.enums import PaymentStatus
from app.payments.base import (CheckoutSession, Notification, PaymentProvider,
                               PaymentProviderError, VerifiedPayment)

# Pesapal GetTransactionStatus: status_code 0=INVALID 1=COMPLETED 2=FAILED 3=REVERSED
_STATUS = {1: PaymentStatus.paid, 2: PaymentStatus.failed, 3: PaymentStatus.refunded}


class PesapalProvider(PaymentProvider):
    name = "pesapal"

    def __init__(self, consumer_key: str, consumer_secret: str, base_url: str,
                 transport: httpx.BaseTransport | None = None, timeout: float = 20.0):
        if not consumer_key or not consumer_secret:
            raise PaymentProviderError("Pesapal credentials are not configured")
        self._key, self._secret = consumer_key, consumer_secret
        self._http = httpx.Client(base_url=base_url.rstrip("/") + "/api", timeout=timeout, transport=transport,
                                  headers={"Accept": "application/json"})
        self._token: str | None = None
        self._token_expiry = 0.0
        self._ipn_ids: dict[str, str] = {}
        self._lock = threading.Lock()

    # ---- low level ----
    @staticmethod
    def _check(data: dict, what: str) -> dict:
        err = data.get("error")
        if err:
            msg = err.get("message") if isinstance(err, dict) else str(err)
            raise PaymentProviderError(f"Pesapal {what} failed: {msg}")
        return data

    def _auth_token(self, force: bool = False) -> str:
        with self._lock:
            if not force and self._token and time.time() < self._token_expiry - 30:
                return self._token
            r = self._http.post("/Auth/RequestToken",
                                json={"consumer_key": self._key, "consumer_secret": self._secret})
            if r.status_code >= 400:
                raise PaymentProviderError(f"Pesapal auth HTTP {r.status_code}")
            data = self._check(r.json(), "authentication")
            if not data.get("token"):
                raise PaymentProviderError("Pesapal auth returned no token")
            self._token = data["token"]
            try:  # tokens last ~5 minutes
                exp = datetime.fromisoformat(data["expiryDate"].replace("Z", "+00:00"))
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                self._token_expiry = exp.timestamp()
            except (KeyError, ValueError):
                self._token_expiry = time.time() + 240
            return self._token

    def _call(self, method: str, path: str, what: str, check: bool = True, **kw) -> dict:
        for attempt in (1, 2):
            headers = {"Authorization": f"Bearer {self._auth_token(force=attempt == 2)}"}
            try:
                r = self._http.request(method, path, headers=headers, **kw)
            except httpx.HTTPError as e:
                raise PaymentProviderError(f"Pesapal {what}: network error ({type(e).__name__})") from e
            if r.status_code == 401 and attempt == 1:
                continue  # token expired early; refresh once
            if r.status_code >= 400:
                raise PaymentProviderError(f"Pesapal {what}: HTTP {r.status_code}")
            try:
                data = r.json()
                return self._check(data, what) if check else data
            except ValueError as e:
                raise PaymentProviderError(f"Pesapal {what}: invalid JSON") from e
        raise PaymentProviderError(f"Pesapal {what}: unauthorized")

    def _ipn_id(self, ipn_url: str) -> str:
        if ipn_url not in self._ipn_ids:
            data = self._call("POST", "/URLSetup/RegisterIPN", "IPN registration",
                              json={"url": ipn_url, "ipn_notification_type": "GET"})
            if not data.get("ipn_id"):
                raise PaymentProviderError("Pesapal IPN registration returned no ipn_id")
            self._ipn_ids[ipn_url] = data["ipn_id"]
        return self._ipn_ids[ipn_url]

    # ---- interface ----
    def create_checkout(self, *, merchant_reference, amount, currency, customer_email, customer_phone,
                        customer_name, country, description, callback_url, ipn_url) -> CheckoutSession:
        first, _, last = customer_name.strip().partition(" ")
        billing = {"email_address": customer_email, "first_name": first, "last_name": last}
        if customer_phone:
            billing["phone_number"] = customer_phone
        if country:
            billing["country_code"] = country
        data = self._call("POST", "/Transactions/SubmitOrderRequest", "order submission", json={
            "id": merchant_reference, "currency": currency, "amount": float(amount),
            "description": description[:100], "callback_url": callback_url,
            "notification_id": self._ipn_id(ipn_url), "billing_address": billing})
        if not data.get("order_tracking_id") or not data.get("redirect_url"):
            raise PaymentProviderError("Pesapal order response missing tracking id or redirect_url")
        return CheckoutSession(provider_reference=data["order_tracking_id"], redirect_url=data["redirect_url"])

    def parse_notification(self, params: dict) -> Notification:
        low = {k.lower(): v for k, v in params.items()}
        tracking, merchant = low.get("ordertrackingid"), low.get("ordermerchantreference")
        if not tracking or not merchant:
            raise PaymentProviderError("Notification missing OrderTrackingId/OrderMerchantReference")
        return Notification(merchant_reference=str(merchant), provider_reference=str(tracking))

    def fetch_status(self, provider_reference: str) -> VerifiedPayment:
        # NOTE (verified against the real sandbox): for an order that has not been paid yet Pesapal answers
        # HTTP 200 with status_code 0, payment_status_description "INVALID" AND an `error` object
        # ("payment_details_not_found" / "Pending Payment"). That is a normal state, not a failure.
        data = self._call("GET", "/Transactions/GetTransactionStatus", "status query", check=False,
                          params={"orderTrackingId": provider_reference})
        code, merchant = data.get("status_code"), data.get("merchant_reference")
        if not isinstance(code, int) or not merchant:
            err = data.get("error")
            msg = err.get("message") if isinstance(err, dict) else err
            raise PaymentProviderError(f"Pesapal status query failed: {msg or 'unexpected response'}")
        try:
            amount = Decimal(str(data["amount"]))
        except (KeyError, ArithmeticError) as e:
            raise PaymentProviderError("Pesapal status response has no valid amount") from e
        status = _STATUS.get(code, PaymentStatus.pending)
        # Belt and braces: 'paid' needs BOTH the numeric code and the text label to agree.
        if status == PaymentStatus.paid and str(data.get("payment_status_description", "")).strip().lower() != "completed":
            status = PaymentStatus.pending
        return VerifiedPayment(merchant_reference=str(merchant), provider_reference=provider_reference,
                               status=status, amount=amount, currency=str(data.get("currency", "")).upper(),
                               method=data.get("payment_method") or None, raw=data)
