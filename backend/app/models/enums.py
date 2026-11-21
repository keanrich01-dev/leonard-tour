import enum


class Role(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    booking_officer = "booking_officer"
    finance = "finance"
    customer = "customer"


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"


class PaymentKind(str, enum.Enum):
    deposit = "deposit"
    balance = "balance"
    full = "full"


class PaymentMethod(str, enum.Enum):
    mobile_money = "mobile_money"
    card = "card"
    bank_transfer = "bank_transfer"


class Currency(str, enum.Enum):
    USD = "USD"
    TZS = "TZS"
    EUR = "EUR"


# Languages supported at launch (ISO 639-1; zh = Simplified Chinese)
LANGUAGES = ("en", "sw", "fr", "zh", "ko")
