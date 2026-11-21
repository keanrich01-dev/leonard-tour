from functools import lru_cache

from fastapi import HTTPException

from app.core.config import settings
from app.payments.base import PaymentProvider


@lru_cache
def get_provider() -> PaymentProvider:
    """Return the configured provider; missing merchant setup is a service-unavailable state."""
    if settings.payment_provider == "pesapal":
        if not settings.pesapal_consumer_key.strip() or not settings.pesapal_consumer_secret.strip():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Online payments are not active yet. Leonard Tour must configure its company Pesapal API credentials "
                    "before checkout can start. Please contact our team or try again later."
                ),
            )
        from app.payments.pesapal import PesapalProvider

        return PesapalProvider(
            settings.pesapal_consumer_key,
            settings.pesapal_consumer_secret,
            settings.pesapal_base_url,
        )

    raise HTTPException(status_code=503, detail="The configured payment provider is not available.")
