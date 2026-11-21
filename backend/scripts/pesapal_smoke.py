"""Live check against the REAL Pesapal sandbox (run on your own machine, with internet).

    docker compose exec backend python -m scripts.pesapal_smoke [CURRENCY] [AMOUNT]
    e.g.  python -m scripts.pesapal_smoke TZS 1000      then   python -m scripts.pesapal_smoke USD 5

Steps: authenticate -> register IPN -> create a test order -> print the checkout link.
Open the link, pay with a Pesapal sandbox test method, then press Enter to query the status.
Nothing is written to the database.
"""
import sys
import uuid
from decimal import Decimal

from app.core.config import settings
from app.payments.base import PaymentProviderError
from app.payments.pesapal import PesapalProvider


def main():
    currency = (sys.argv[1] if len(sys.argv) > 1 else "TZS").upper()
    amount = Decimal(sys.argv[2] if len(sys.argv) > 2 else "1000")
    print(f"Base URL : {settings.pesapal_base_url}")
    print(f"IPN URL  : {settings.public_api_url}/api/payments/pesapal/ipn")
    if "localhost" in settings.public_api_url or "127.0.0.1" in settings.public_api_url:
        print("NOTE: PUBLIC_API_URL is local. Pesapal may reject it or never reach it. Use a tunnel "
              "(ngrok / cloudflared) and set PUBLIC_API_URL to the https address.\n")
    try:
        p = PesapalProvider(settings.pesapal_consumer_key, settings.pesapal_consumer_secret, settings.pesapal_base_url)
        p._auth_token()
        print("1. Authentication: OK")
        ref = f"SMOKE-{uuid.uuid4().hex[:10].upper()}"
        s = p.create_checkout(merchant_reference=ref, amount=amount, currency=currency,
                              customer_email="test@example.com", customer_phone="0712345678",
                              customer_name="Smoke Test", country="TZ", description="Leonard Tour smoke test",
                              callback_url=f"{settings.frontend_url}/payment-result",
                              ipn_url=f"{settings.public_api_url}/api/payments/pesapal/ipn")
        print("2. IPN registered + order created: OK")
        print(f"   tracking id : {s.provider_reference}\n   CHECKOUT URL: {s.redirect_url}")
        input("\nOpen the URL, complete (or abandon) the test payment, then press Enter to query status... ")
        v = p.fetch_status(s.provider_reference)
        print(f"3. Status: {v.status.value}  amount={v.amount} {v.currency}  method={v.method}")
        print("   raw:", v.raw)
    except PaymentProviderError as e:
        sys.exit(f"FAILED: {e}")


if __name__ == "__main__":
    main()
