from datetime import date
from decimal import Decimal

_MONTHS = {
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    "sw": ["Januari", "Februari", "Machi", "Aprili", "Mei", "Juni", "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba"],
    "fr": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
}


def fmt_date(d: date, lang: str) -> str:
    if lang == "zh":
        return f"{d.year}年{d.month}月{d.day}日"
    if lang == "ko":
        return f"{d.year}년 {d.month}월 {d.day}일"
    return f"{d.day} {_MONTHS.get(lang, _MONTHS['en'])[d.month - 1]} {d.year}"


def fmt_money(amount: Decimal | int | float | str, currency: str) -> str:
    """Currency code + amount, e.g. 'USD 1,250.00' / 'TZS 2,500,000'. The code is unambiguous in every language."""
    a = Decimal(str(amount))
    return f"{currency} {a:,.0f}" if currency == "TZS" else f"{currency} {a:,.2f}"
