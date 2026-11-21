from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP, ROUND_UP

from app.core.config import settings
from app.models import Package


class PricingError(Exception):
    pass


@dataclass
class Quote:
    currency: str
    per_person: Decimal
    total: Decimal
    deposit: Decimal
    adults_total: Decimal
    children_total: Decimal
    discount_total: Decimal
    children_breakdown: list[dict]

    def as_dict(self) -> dict:
        return {
            "currency": self.currency,
            "adult_unit_price": str(self.per_person),
            "adults_total": str(self.adults_total),
            "children_total": str(self.children_total),
            "child_discount_total": str(self.discount_total),
            "total": str(self.total),
            "deposit": str(self.deposit),
            "balance_after_deposit": str(self.total - self.deposit),
            "children": self.children_breakdown,
        }


def _unit(currency: str) -> Decimal:
    return Decimal("1") if currency == "TZS" else Decimal("0.01")


def per_person_price(pkg: Package, currency: str, pax: int) -> Decimal | None:
    tiers = [
        tier for tier in pkg.prices
        if tier.currency == currency and tier.pax_min <= pax
        and (tier.pax_max is None or pax <= tier.pax_max)
    ]
    if tiers:
        return max(tiers, key=lambda tier: tier.pax_min).amount_per_person
    return {"USD": pkg.price_from_usd, "TZS": pkg.price_from_tzs}.get(currency)


def child_rate(pkg: Package, age: int) -> tuple[Decimal, str]:
    """Return package-specific child multiplier and the human-readable age band."""
    rules = pkg.child_pricing_rules or {}
    bands = rules.get("bands", []) if isinstance(rules, dict) else []
    for band in bands:
        try:
            minimum = int(band["min_age"])
            maximum = int(band["max_age"])
            if minimum <= age <= maximum:
                factor = Decimal(str(band["factor"]))
                if factor < 0 or factor > 1:
                    raise PricingError("Invalid child pricing rule. Please contact the company.")
                return factor, str(band.get("label") or f"Age {minimum}-{maximum}")
        except (KeyError, TypeError, ValueError):
            continue
    # Backward-compatible fallback for packages without explicit age bands.
    return settings.child_price_factor, "Child rate to be confirmed"


def make_quote(
    pkg: Package,
    currency: str,
    adults: int,
    children: int,
    child_ages: list[int] | None = None,
) -> Quote:
    """Server-side quote. Never trusts amounts supplied by the browser."""
    if adults < 1:
        raise PricingError("At least one adult is required.")
    child_ages = list(child_ages or [])
    if children and child_ages and len(child_ages) != children:
        raise PricingError("Please provide the age of every child.")
    if any(age < 0 or age > 15 for age in child_ages):
        raise PricingError("Travellers aged 16 or above must be counted as adults.")
    if children and not child_ages:
        # For legacy API clients that do not yet send ages, retain the configured fallback factor.
        child_ages = [15] * children

    pax = adults + children
    price = per_person_price(pkg, currency, pax)
    if price is None:
        raise PricingError(f"This package is not priced in {currency}.")

    unit = _unit(currency)
    adults_total = (price * Decimal(adults)).quantize(unit, rounding=ROUND_HALF_UP)
    child_rows: list[dict] = []
    children_total = Decimal("0")
    full_child_total = Decimal("0")
    for index, age in enumerate(child_ages, start=1):
        factor, label = child_rate(pkg, age)
        amount = (price * factor).quantize(unit, rounding=ROUND_HALF_UP)
        children_total += amount
        full_child_total += price
        child_rows.append({
            "number": index,
            "age": age,
            "category": label,
            "factor": str(factor),
            "amount": str(amount),
        })

    total = (adults_total + children_total).quantize(unit, rounding=ROUND_HALF_UP)
    discount = max(Decimal("0"), full_child_total - children_total).quantize(unit, rounding=ROUND_HALF_UP)
    deposit = (total * settings.deposit_percent / 100).quantize(unit, rounding=ROUND_UP)
    return Quote(
        currency=currency,
        per_person=price,
        total=total,
        deposit=min(deposit, total),
        adults_total=adults_total,
        children_total=children_total,
        discount_total=discount,
        children_breakdown=child_rows,
    )
