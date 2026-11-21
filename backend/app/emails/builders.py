"""Turn database rows into ready-to-send emails. Each builder returns a list of RenderedEmail (one per recipient)."""
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decrypt
from app.emails.catalog import MESSAGES
from app.emails.formatting import fmt_date, fmt_money
from app.emails.render import Content, RenderedEmail, render
from app.models import Booking, Inquiry, Package, PackageTranslation, Payment, PaymentEvent, Testimonial, User
from app.models.enums import BookingStatus
from app.services.payments import paid_total


def _lang(lang: str) -> str:
    return lang if lang in MESSAGES else "en"


def _package_title(db: Session, package_id: int, lang: str) -> str:
    rows = {t.lang: t.title for t in db.scalars(select(PackageTranslation).where(PackageTranslation.package_id == package_id))}
    if lang in rows or "en" in rows:
        return rows.get(lang) or rows["en"]
    pkg = db.get(Package, package_id)
    return pkg.slug if pkg else "-"


def booking_link(b: Booking) -> str:
    """Customer's personal link. The access code travels in the #fragment, which browsers never send to servers."""
    base = f"{settings.frontend_url}/booking/{b.reference}"
    if b.public_token_enc:
        try:
            return f"{base}#{decrypt(b.public_token_enc)}"
        except Exception:  # key rotated / corrupted: fall back to a link that asks for the code
            pass
    return base


def _frame(lang: str, M: dict, name: str) -> dict:
    c = M["common"]
    return dict(lang=lang, greeting=c["greeting"].format(name=name),
                closing=c["team"].format(company=settings.company_name),
                footer=c["help"].format(contact=settings.company_contact))


# ---------------------------------------------------------------- customer emails
def booking_created(db: Session, booking_id: int, extra: dict) -> list[RenderedEmail]:
    b = db.get(Booking, booking_id)
    if not b:
        return []
    lang = _lang(b.language)
    M = MESSAGES[lang]; c, m = M["common"], M["booking_created"]
    title = _package_title(db, b.package_id, lang)
    ctx = dict(reference=b.reference, company=settings.company_name, package=title,
               deposit=fmt_money(b.deposit_amount, b.currency))
    content = Content(
        subject=m["subject"].format(**ctx), preheader=m["preheader"], paragraphs=[m["intro"].format(**ctx)],
        notices=[m["pending_notice"].format(**ctx)],
        rows=[(c["reference"], b.reference), (c["package"], title), (c["travel_date"], fmt_date(b.travel_date, lang)),
              (c["adults"], str(b.adults)), (c["children"], str(b.children)),
              (c["total"], fmt_money(b.total_amount, b.currency)), (c["deposit_due"], ctx["deposit"])],
        cta=(m["cta"], booking_link(b)), **_frame(lang, M, b.customer_name))
    return [render(content, b.customer_email, "booking_created")]


def payment_received(db: Session, payment_id: int, extra: dict) -> list[RenderedEmail]:
    p = db.get(Payment, payment_id)
    b = db.get(Booking, p.booking_id) if p else None
    if not p or not b:
        return []
    lang = _lang(b.language)
    M = MESSAGES[lang]; c, m = M["common"], M["payment_received"]
    paid = paid_total(db, b.id)
    balance = b.total_amount - paid
    ctx = dict(reference=b.reference, amount=fmt_money(p.amount, p.currency), balance=fmt_money(balance, b.currency))
    notices = []
    if b.status == BookingStatus.confirmed:
        notices.append(m["confirmed_notice"])
    notices.append(m["balance_notice"].format(**ctx) if balance > 0 else m["fully_paid_notice"])
    rows = [(c["reference"], b.reference), (c["amount_paid"], ctx["amount"])]
    if p.method:
        rows.append((c["payment_method"], c["method_" + p.method.value] if "method_" + p.method.value in c else p.method.value))
    if p.paid_at:
        rows.append((c["payment_date"], fmt_date(p.paid_at.astimezone(timezone.utc).date(), lang)))
    rows += [(c["total"], fmt_money(b.total_amount, b.currency)), (c["paid_so_far"], fmt_money(paid, b.currency)),
             (c["balance_due"], ctx["balance"])]
    content = Content(subject=m["subject"].format(**ctx), preheader=m["preheader"],
                      paragraphs=[m["intro"].format(**ctx)], notices=notices, rows=rows,
                      cta=(m["cta"], booking_link(b)), **_frame(lang, M, b.customer_name))
    return [render(content, b.customer_email, "payment_received")]


def booking_cancelled(db: Session, booking_id: int, extra: dict) -> list[RenderedEmail]:
    b = db.get(Booking, booking_id)
    if not b:
        return []
    lang = _lang(b.language)
    M = MESSAGES[lang]; c, m = M["common"], M["booking_cancelled"]
    title = _package_title(db, b.package_id, lang)
    ctx = dict(reference=b.reference, package=title)
    content = Content(subject=m["subject"].format(**ctx), preheader=m["preheader"], paragraphs=[m["intro"].format(**ctx)],
                      notices=[m["refund_notice"]],
                      rows=[(c["reference"], b.reference), (c["package"], title),
                            (c["travel_date"], fmt_date(b.travel_date, lang)), (c["status"], c["status_cancelled"])],
                      **_frame(lang, M, b.customer_name))
    return [render(content, b.customer_email, "booking_cancelled")]


def balance_reminder(db: Session, booking_id: int, extra: dict) -> list[RenderedEmail]:
    b = db.get(Booking, booking_id)
    if not b or b.status != BookingStatus.confirmed:
        return []
    balance = b.total_amount - paid_total(db, b.id)
    if balance <= 0:
        return []
    lang = _lang(b.language)
    M = MESSAGES[lang]; c, m = M["common"], M["balance_reminder"]
    title = _package_title(db, b.package_id, lang)
    ctx = dict(reference=b.reference, package=title, date=fmt_date(b.travel_date, lang),
               balance=fmt_money(balance, b.currency))
    content = Content(subject=m["subject"].format(**ctx), preheader=m["preheader"], paragraphs=[m["intro"].format(**ctx)],
                      rows=[(c["reference"], b.reference), (c["travel_date"], ctx["date"]),
                            (c["total"], fmt_money(b.total_amount, b.currency)),
                            (c["paid_so_far"], fmt_money(b.total_amount - balance, b.currency)),
                            (c["balance_due"], ctx["balance"])],
                      cta=(m["cta"], booking_link(b)), **_frame(lang, M, b.customer_name))
    return [render(content, b.customer_email, "balance_reminder")]


# ---------------------------------------------------------------- staff emails (English)
def _staff(subject: str, paragraphs: list[str], rows: list[tuple[str, str]], to: list[str], kind: str,
           notices: list[str] | None = None, cta: tuple[str, str] | None = None) -> list[RenderedEmail]:
    content = Content(subject=subject, preheader=subject, greeting="Hello,", paragraphs=paragraphs, rows=rows,
                      notices=notices or [], cta=cta, closing=f"{settings.company_name} system",
                      footer="Automatic message for staff. Do not forward outside the company.", lang="en")
    return [render(content, addr, kind) for addr in to]


def admin_new_booking(db: Session, booking_id: int, extra: dict) -> list[RenderedEmail]:
    b = db.get(Booking, booking_id)
    if not b or not settings.admin_emails:
        return []
    title = _package_title(db, b.package_id, "en")
    return _staff(f"New booking {b.reference}: {title}", ["A new booking request was received."],
                  [("Reference", b.reference), ("Tour", title), ("Customer", b.customer_name),
                   ("Email", b.customer_email), ("Phone", b.customer_phone or "-"), ("Country", b.country or "-"),
                   ("Language", b.language), ("Travel date", fmt_date(b.travel_date, "en")),
                   ("Travelers", f"{b.adults} adults, {b.children} children"),
                   ("Total", fmt_money(b.total_amount, b.currency)), ("Deposit", fmt_money(b.deposit_amount, b.currency)),
                   ("Notes", b.notes or "-")], settings.admin_emails, "admin_new_booking")


def admin_payment_paid(db: Session, payment_id: int, extra: dict) -> list[RenderedEmail]:
    p = db.get(Payment, payment_id)
    b = db.get(Booking, p.booking_id) if p else None
    if not p or not b or not settings.admin_emails:
        return []
    return _staff(f"Payment received {fmt_money(p.amount, p.currency)} – {b.reference}",
                  ["A payment was verified with the payment provider."],
                  [("Booking", b.reference), ("Customer", b.customer_name), ("Amount", fmt_money(p.amount, p.currency)),
                   ("Kind", p.kind.value), ("Method", p.method.value if p.method else "-"),
                   ("Provider reference", p.provider_reference or "-"), ("Booking status", b.status.value)],
                  settings.admin_emails, "admin_payment_paid")


def admin_amount_mismatch(db: Session, payment_id: int, extra: dict) -> list[RenderedEmail]:
    p = db.get(Payment, payment_id)
    b = db.get(Booking, p.booking_id) if p else None
    if not p or not b or not settings.admin_emails:
        return []
    ev = db.scalar(select(PaymentEvent).where(PaymentEvent.payment_id == p.id).order_by(PaymentEvent.id.desc()))
    got = f"{(ev.payload or {}).get('amount', '?')} {(ev.payload or {}).get('currency', '')}" if ev else "unknown"
    return _staff(f"ACTION NEEDED: payment amount mismatch – {b.reference}",
                  ["The payment provider reports a payment whose amount or currency differs from what we requested. "
                   "The booking was NOT confirmed automatically."],
                  [("Booking", b.reference), ("Customer", b.customer_name), ("Customer email", b.customer_email),
                   ("Expected", fmt_money(p.amount, p.currency)), ("Provider reports", got.strip()),
                   ("Provider reference", p.provider_reference or "-")],
                  settings.admin_emails, "admin_amount_mismatch",
                  notices=["Check the transaction in the provider dashboard and contact the customer."])



INQUIRY_COPY = {
    "en": ("We received your message – {company}", "We have received your enquiry and our travel team will review it.", "We will contact you using the details you provided."),
    "sw": ("Tumepokea ujumbe wako – {company}", "Tumepokea ombi lako na timu yetu ya safari italipitia.", "Tutawasiliana nawe kupitia taarifa ulizotupatia."),
    "fr": ("Nous avons reçu votre message – {company}", "Nous avons bien reçu votre demande et notre équipe voyage va l’examiner.", "Nous vous contacterons à l’aide des coordonnées fournies."),
    "zh": ("我们已收到您的留言 – {company}", "我们已收到您的咨询，旅行团队将进行查看。", "我们会通过您提供的联系方式与您联系。"),
    "ko": ("문의가 접수되었습니다 – {company}", "문의가 접수되었으며 여행팀이 내용을 확인하겠습니다.", "제공해 주신 연락처로 안내해 드리겠습니다。"),
}
INQUIRY_LABELS = {
    "en": ("Email", "WhatsApp", "Message"),
    "sw": ("Barua pepe", "WhatsApp", "Ujumbe"),
    "fr": ("E-mail", "WhatsApp", "Message"),
    "zh": ("电子邮箱", "WhatsApp", "留言"),
    "ko": ("이메일", "WhatsApp", "메시지"),
}

def customer_inquiry_received(db: Session, inquiry_id: int, extra: dict) -> list[RenderedEmail]:
    row = db.get(Inquiry, inquiry_id)
    if not row or not row.email:
        return []
    lang = _lang(getattr(row, "language", "en"))
    subject, intro, followup = INQUIRY_COPY[lang]
    company = settings.company_name
    M = MESSAGES[lang]
    common = M["common"]
    first_name = row.name.split()[0] if row.name else "there"
    greeting = f"Hello, {first_name}," if lang == "en" else common["greeting"].format(name=first_name)
    labels = INQUIRY_LABELS[lang]
    message = (row.message or "-").strip()
    content = Content(
        subject=subject.format(company=company),
        preheader=intro,
        greeting=greeting,
        paragraphs=[intro, followup],
        rows=[(labels[0], row.email), (labels[1], row.whatsapp or "-"), (labels[2], message[:1200])],
        closing=common["team"].format(company=company),
        footer=common["help"].format(contact=settings.company_contact),
        lang=lang,
    )
    return [render(content, row.email, "customer_inquiry_received")]


def admin_new_testimonial(db: Session, testimonial_id: int, extra: dict) -> list[RenderedEmail]:
    row = db.get(Testimonial, testimonial_id)
    if not row or not settings.admin_emails:
        return []
    return _staff(
        f"New guest review awaiting approval: {row.name}",
        ["A new guest review has been submitted. It is NOT public yet and needs an administrator to approve or reject it."],
        [("Name", row.name), ("Email", row.email or "-"), ("Country", row.country or "-"),
         ("Rating", f"{row.rating}/5"), ("Review", row.message[:700])],
        settings.admin_emails,
        "admin_new_testimonial",
        cta=("Open testimonial moderation", f"{settings.frontend_url}/admin/testimonials"),
    )


def admin_new_inquiry(db: Session, inquiry_id: int, extra: dict) -> list[RenderedEmail]:
    row = db.get(Inquiry, inquiry_id)
    if not row or not settings.admin_emails:
        return []
    package_title = _package_title(db, row.package_id, "en") if row.package_id else "General enquiry"
    return _staff(
        f"New safari enquiry from {row.name}: {package_title}",
        ["A traveller submitted a new enquiry through the Leonard Tour website."],
        [("Package", package_title), ("Name", row.name), ("Email", row.email),
         ("Country", row.country or "-"), ("WhatsApp", row.whatsapp or "-"),
         ("Travellers", str(row.travelers or "-")), ("Message", (row.message or "-")[:1200])],
        settings.admin_emails,
        "admin_new_inquiry",
        cta=("Open guest enquiries", f"{settings.frontend_url}/admin/inquiries"),
    )


SECURITY_EVENTS = {
    "account_locked": ("Your account was temporarily locked", "There were several failed sign-in attempts on your admin account, so it was locked for a short time. If this was not you, ask an administrator to review your account."),
    "mfa_enabled": ("Two-factor authentication was enabled", "Two-factor authentication was turned on for your admin account. If this was not you, contact an administrator immediately."),
    "mfa_reset": ("Your two-factor authentication was reset", "An administrator reset your two-factor authentication. You will be asked to set it up again at your next sign-in."),
    "password_changed": ("Your password was changed", "The password of your admin account was changed and other sessions were signed out. If this was not you, contact an administrator immediately."),
}


def security_alert(db: Session, user_id: int, extra: dict) -> list[RenderedEmail]:
    u = db.get(User, user_id)
    info = SECURITY_EVENTS.get((extra or {}).get("event", ""))
    if not u or not info:
        return []
    when = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    content = Content(subject=f"Security alert: {info[0]}", preheader=info[0], greeting=f"Hello {u.full_name},",
                      paragraphs=[info[1]], rows=[("Account", u.email), ("Time", when)], notices=[],
                      closing=f"{settings.company_name} security", footer="Automatic security message.", lang="en")
    return [render(content, u.email, "security_alert")]


BUILDERS = {"booking_created": booking_created, "payment_received": payment_received,
            "booking_cancelled": booking_cancelled, "balance_reminder": balance_reminder,
            "admin_new_booking": admin_new_booking, "admin_payment_paid": admin_payment_paid,
            "admin_amount_mismatch": admin_amount_mismatch, "admin_new_testimonial": admin_new_testimonial,
            "admin_new_inquiry": admin_new_inquiry, "customer_inquiry_received": customer_inquiry_received, "security_alert": security_alert}
