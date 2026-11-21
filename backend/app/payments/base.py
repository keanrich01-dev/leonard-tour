"""Provider-agnostic payment interface. Each gateway implements this (sync, so it runs in FastAPI's threadpool and Celery)."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal

from app.models.enums import PaymentStatus


class PaymentProviderError(Exception):
    """Gateway refused or failed. Message is safe to log, not to show customers."""


@dataclass
class CheckoutSession:
    provider_reference: str  # gateway's tracking id
    redirect_url: str        # hosted checkout page (card/mobile-money details never touch our servers)


@dataclass
class Notification:
    merchant_reference: str
    provider_reference: str


@dataclass
class VerifiedPayment:
    merchant_reference: str
    provider_reference: str
    status: PaymentStatus
    amount: Decimal
    currency: str
    method: str | None = None
    raw: dict | None = None


class PaymentProvider(ABC):
    name: str

    @abstractmethod
    def create_checkout(self, *, merchant_reference: str, amount: Decimal, currency: str,
                        customer_email: str, customer_phone: str | None, customer_name: str,
                        country: str | None, description: str, callback_url: str,
                        ipn_url: str) -> CheckoutSession: ...

    @abstractmethod
    def parse_notification(self, params: dict) -> Notification:
        """Extract identifiers from a gateway notification. Notifications are NOT proof of payment."""

    @abstractmethod
    def fetch_status(self, provider_reference: str) -> VerifiedPayment:
        """Ask the gateway directly (authenticated). A payment becomes 'paid' ONLY from this result."""
