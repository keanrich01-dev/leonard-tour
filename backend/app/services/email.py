"""Transactional emails in en / sw / fr / zh / ko.

Emails never block the request path: send failures are logged and audited,
never raised to the caller. SMTP is optional — if SMTP_HOST is empty, messages
are rendered and logged at INFO (dev-friendly) but not delivered.
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from typing import Any

from typing import TYPE_CHECKING

from jinja2 import BaseLoader, Environment, select_autoescape

from app.core.config import settings
from app.models.enums import LANGUAGES

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from app.models import Booking, Package, PackageTranslation, Payment

log = logging.getLogger("email")

# ---------------------------------------------------------------------------
# Translations (subjects + body copy). Keep keys stable; add languages freely.
# ---------------------------------------------------------------------------
T: dict[str, dict[str, str]] = {
    "en": {
        "booking_received_subject": "Booking received — {reference}",
        "booking_received_title": "We received your booking",
        "booking_received_body": (
            "Thank you, {name}. Your booking request for <strong>{package}</strong> "
            "has been received. Please complete payment to confirm your place."
        ),
        "pay_cta": "Pay now / manage booking",
        "payment_confirmed_subject": "Payment received — booking {reference} confirmed",
        "payment_confirmed_title": "Your booking is confirmed",
        "payment_confirmed_body": (
            "Great news, {name}! We have received your payment of "
            "<strong>{amount} {currency}</strong> for <strong>{package}</strong>. "
            "Your booking <strong>{reference}</strong> is now confirmed."
        ),
        "view_booking": "View your booking",
        "cancelled_subject": "Booking {reference} cancelled",
        "cancelled_title": "Your booking has been cancelled",
        "cancelled_body": (
            "Hello {name}, your booking <strong>{reference}</strong> for "
            "<strong>{package}</strong> has been cancelled. "
            "If you already paid, our finance team will contact you about a refund."
        ),
        "details": "Booking details",
        "reference": "Reference",
        "package": "Package",
        "travel_date": "Travel date",
        "travelers": "Travelers",
        "adults": "adults",
        "children": "children",
        "total": "Total",
        "deposit": "Deposit",
        "amount_paid": "Amount paid",
        "footer": "Leonard Tour · Tanzania",
        "questions": "Questions? Reply to this email or contact us on WhatsApp.",
    },
    "sw": {
        "booking_received_subject": "Ombi la uhifadhi limepokewa — {reference}",
        "booking_received_title": "Tumepokea ombi lako la uhifadhi",
        "booking_received_body": (
            "Asante, {name}. Ombi lako la uhifadhi kwa <strong>{package}</strong> "
            "limepokewa. Tafadhali kamilisha malipo ili kuthibitisha nafasi yako."
        ),
        "pay_cta": "Lipa sasa / simamia uhifadhi",
        "payment_confirmed_subject": "Malipo yamepokelewa — uhifadhi {reference} umethibitishwa",
        "payment_confirmed_title": "Uhifadhi wako umethibitishwa",
        "payment_confirmed_body": (
            "Habari njema, {name}! Tumepokea malipo yako ya "
            "<strong>{amount} {currency}</strong> kwa <strong>{package}</strong>. "
            "Uhifadhi wako <strong>{reference}</strong> sasa umethibitishwa."
        ),
        "view_booking": "Angalia uhifadhi wako",
        "cancelled_subject": "Uhifadhi {reference} umeghairiwa",
        "cancelled_title": "Uhifadhi wako umeghairiwa",
        "cancelled_body": (
            "Habari {name}, uhifadhi wako <strong>{reference}</strong> wa "
            "<strong>{package}</strong> umeghairiwa. "
            "Ikiwa umeshalipa, timu yetu ya fedha itawasiliana nawe kuhusu marejesho."
        ),
        "details": "Maelezo ya uhifadhi",
        "reference": "Nambari",
        "package": "Kifurushi",
        "travel_date": "Tarehe ya safari",
        "travelers": "Wasafiri",
        "adults": "watu wazima",
        "children": "watoto",
        "total": "Jumla",
        "deposit": "Depositi",
        "amount_paid": "Kiasi kilicholipwa",
        "footer": "Leonard Tour · Tanzania",
        "questions": "Maswali? Jibu barua hii au wasiliana nasi kupitia WhatsApp.",
    },
    "fr": {
        "booking_received_subject": "Réservation reçue — {reference}",
        "booking_received_title": "Nous avons reçu votre réservation",
        "booking_received_body": (
            "Merci, {name}. Votre demande de réservation pour <strong>{package}</strong> "
            "a bien été reçue. Veuillez finaliser le paiement pour confirmer votre place."
        ),
        "pay_cta": "Payer / gérer la réservation",
        "payment_confirmed_subject": "Paiement reçu — réservation {reference} confirmée",
        "payment_confirmed_title": "Votre réservation est confirmée",
        "payment_confirmed_body": (
            "Bonne nouvelle, {name} ! Nous avons reçu votre paiement de "
            "<strong>{amount} {currency}</strong> pour <strong>{package}</strong>. "
            "Votre réservation <strong>{reference}</strong> est maintenant confirmée."
        ),
        "view_booking": "Voir votre réservation",
        "cancelled_subject": "Réservation {reference} annulée",
        "cancelled_title": "Votre réservation a été annulée",
        "cancelled_body": (
            "Bonjour {name}, votre réservation <strong>{reference}</strong> pour "
            "<strong>{package}</strong> a été annulée. "
            "Si vous avez déjà payé, notre équipe finance vous contactera concernant un remboursement."
        ),
        "details": "Détails de la réservation",
        "reference": "Référence",
        "package": "Circuit",
        "travel_date": "Date de voyage",
        "travelers": "Voyageurs",
        "adults": "adultes",
        "children": "enfants",
        "total": "Total",
        "deposit": "Acompte",
        "amount_paid": "Montant payé",
        "footer": "Leonard Tour · Tanzanie",
        "questions": "Des questions ? Répondez à cet e-mail ou contactez-nous sur WhatsApp.",
    },
    "zh": {
        "booking_received_subject": "已收到预订 — {reference}",
        "booking_received_title": "我们已收到您的预订",
        "booking_received_body": (
            "谢谢，{name}。我们已收到您对<strong>{package}</strong>的预订请求。"
            "请完成付款以确认您的名额。"
        ),
        "pay_cta": "立即付款 / 管理预订",
        "payment_confirmed_subject": "已收到付款 — 预订 {reference} 已确认",
        "payment_confirmed_title": "您的预订已确认",
        "payment_confirmed_body": (
            "好消息，{name}！我们已收到您为<strong>{package}</strong>支付的"
            "<strong>{amount} {currency}</strong>。预订<strong>{reference}</strong>现已确认。"
        ),
        "view_booking": "查看您的预订",
        "cancelled_subject": "预订 {reference} 已取消",
        "cancelled_title": "您的预订已取消",
        "cancelled_body": (
            "您好 {name}，您的预订<strong>{reference}</strong>（<strong>{package}</strong>）已取消。"
            "如已付款，财务团队将与您联系退款事宜。"
        ),
        "details": "预订详情",
        "reference": "参考号",
        "package": "行程",
        "travel_date": "出行日期",
        "travelers": "旅客",
        "adults": "成人",
        "children": "儿童",
        "total": "总计",
        "deposit": "订金",
        "amount_paid": "已付金额",
        "footer": "Leonard Tour · 坦桑尼亚",
        "questions": "有问题？直接回复此邮件，或通过 WhatsApp 联系我们。",
    },
    "ko": {
        "booking_received_subject": "예약 접수 — {reference}",
        "booking_received_title": "예약을 접수했습니다",
        "booking_received_body": (
            "감사합니다, {name}님. <strong>{package}</strong> 예약 요청을 접수했습니다. "
            "자리를 확정하려면 결제를 완료해 주세요."
        ),
        "pay_cta": "지금 결제 / 예약 관리",
        "payment_confirmed_subject": "결제 확인 — 예약 {reference} 확정",
        "payment_confirmed_title": "예약이 확정되었습니다",
        "payment_confirmed_body": (
            "좋은 소식입니다, {name}님! <strong>{package}</strong>에 대한 "
            "<strong>{amount} {currency}</strong> 결제를 확인했습니다. "
            "예약 <strong>{reference}</strong>이(가) 확정되었습니다."
        ),
        "view_booking": "예약 보기",
        "cancelled_subject": "예약 {reference} 취소됨",
        "cancelled_title": "예약이 취소되었습니다",
        "cancelled_body": (
            "안녕하세요 {name}님, <strong>{package}</strong> 예약 "
            "<strong>{reference}</strong>이(가) 취소되었습니다. "
            "이미 결제하셨다면 재무팀이 환불에 대해 연락드립니다."
        ),
        "details": "예약 상세",
        "reference": "참조번호",
        "package": "상품",
        "travel_date": "여행일",
        "travelers": "여행자",
        "adults": "성인",
        "children": "어린이",
        "total": "합계",
        "deposit": "예약금",
        "amount_paid": "결제 금액",
        "footer": "Leonard Tour · 탄자니아",
        "questions": "문의가 있으신가요? 이 메일에 회신하거나 WhatsApp으로 연락해 주세요.",
    },
}

_HTML = """\
<!DOCTYPE html>
<html lang="{{ lang }}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td style="background:#0f766e;padding:20px 28px">
          <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.02em">Leonard Tour</div>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">{{ title }}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3f3f46">{{ body|safe }}</p>
          {% if cta_url and cta_label %}
          <p style="margin:0 0 24px">
            <a href="{{ cta_url }}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px">{{ cta_label }}</a>
          </p>
          {% endif %}
          <div style="border-top:1px solid #e4e4e7;padding-top:16px;margin-top:8px">
            <div style="font-size:13px;font-weight:600;color:#71717a;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">{{ t.details }}</div>
            <table role="presentation" width="100%" style="font-size:14px;line-height:1.6;color:#3f3f46">
              <tr><td style="padding:2px 0;color:#71717a">{{ t.reference }}</td><td align="right" style="font-weight:600">{{ reference }}</td></tr>
              <tr><td style="padding:2px 0;color:#71717a">{{ t.package }}</td><td align="right">{{ package_title }}</td></tr>
              <tr><td style="padding:2px 0;color:#71717a">{{ t.travel_date }}</td><td align="right">{{ travel_date }}</td></tr>
              <tr><td style="padding:2px 0;color:#71717a">{{ t.travelers }}</td><td align="right">{{ travelers }}</td></tr>
              <tr><td style="padding:2px 0;color:#71717a">{{ t.total }}</td><td align="right">{{ total }} {{ currency }}</td></tr>
              {% if deposit %}<tr><td style="padding:2px 0;color:#71717a">{{ t.deposit }}</td><td align="right">{{ deposit }} {{ currency }}</td></tr>{% endif %}
              {% if amount_paid %}<tr><td style="padding:2px 0;color:#71717a">{{ t.amount_paid }}</td><td align="right">{{ amount_paid }} {{ currency }}</td></tr>{% endif %}
            </table>
          </div>
          <p style="margin:24px 0 0;font-size:13px;color:#71717a">{{ t.questions }}</p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:14px 28px;font-size:12px;color:#a1a1aa;text-align:center">{{ t.footer }}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

_env = Environment(loader=BaseLoader(), autoescape=select_autoescape(["html"]))
_html_tmpl = _env.from_string(_HTML)


def _lang(code: str | None) -> str:
    return code if code in LANGUAGES else "en"


def _t(lang: str) -> dict[str, str]:
    return T.get(lang) or T["en"]


def package_title(db: "Session", package_id: int, lang: str) -> str:
    from sqlalchemy import select
    from app.models import Package, PackageTranslation
    tr = db.scalar(select(PackageTranslation).where(
        PackageTranslation.package_id == package_id, PackageTranslation.lang == lang))
    if tr:
        return tr.title
    tr = db.scalar(select(PackageTranslation).where(
        PackageTranslation.package_id == package_id, PackageTranslation.lang == "en"))
    if tr:
        return tr.title
    pkg = db.get(Package, package_id)
    return pkg.slug if pkg else f"#{package_id}"


def _booking_ctx(db: "Session", b: "Booking", *, amount_paid: str | None = None) -> dict[str, Any]:
    lang = _lang(b.language)
    t = _t(lang)
    title = package_title(db, b.package_id, lang)
    travelers = f"{b.adults} {t['adults']}"
    if b.children:
        travelers += f", {b.children} {t['children']}"
    return {
        "lang": lang,
        "t": t,
        "name": b.customer_name.split()[0] if b.customer_name else "",
        "reference": b.reference,
        "package_title": title,
        "package": title,
        "travel_date": b.travel_date.isoformat() if b.travel_date else "—",
        "travelers": travelers,
        "total": str(b.total_amount),
        "deposit": str(b.deposit_amount) if b.deposit_amount else None,
        "currency": b.currency,
        "amount_paid": amount_paid,
        "frontend_url": settings.frontend_url.rstrip("/"),
    }


def _render(subject_key: str, title_key: str, body_key: str, ctx: dict[str, Any],
            *, cta_url: str | None = None, cta_label_key: str | None = None) -> tuple[str, str, str]:
    t: dict[str, str] = ctx["t"]
    fmt = {k: ctx.get(k, "") for k in ("name", "reference", "package", "amount", "currency")}
    subject = t[subject_key].format(**fmt)
    title = t[title_key]
    body = t[body_key].format(**fmt)
    cta_label = t[cta_label_key] if cta_label_key else None
    html = _html_tmpl.render(
        title=title, body=body, cta_url=cta_url, cta_label=cta_label, **ctx
    )
    # Plain-text fallback
    plain_parts = [
        title,
        "",
        body.replace("<strong>", "").replace("</strong>", ""),
        "",
        f"{t['reference']}: {ctx['reference']}",
        f"{t['package']}: {ctx['package_title']}",
        f"{t['travel_date']}: {ctx['travel_date']}",
        f"{t['travelers']}: {ctx['travelers']}",
        f"{t['total']}: {ctx['total']} {ctx['currency']}",
    ]
    if cta_url:
        plain_parts += ["", f"{cta_label or 'Link'}: {cta_url}"]
    plain_parts += ["", t["footer"]]
    return subject, html, "\n".join(plain_parts)


def send_email(*, to: str, subject: str, html: str, text: str, db: "Session" | None = None) -> bool:
    """Deliver one message. Returns True on success (or dry-run log). Never raises."""
    if not to:
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.email_from
    msg["To"] = to
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    if not settings.email_enabled:
        log.info("EMAIL (dry-run) to=%s subject=%r", to, subject)
        return True

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
            smtp.ehlo()
            if settings.smtp_port != 25:
                smtp.starttls()
                smtp.ehlo()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
        log.info("EMAIL sent to=%s subject=%r", to, subject)
        return True
    except Exception as e:
        log.exception("EMAIL failed to=%s: %s", to, e)
        if db is not None:
            try:
                from app.services.audit import audit
                audit(db, user_id=None, action="email.failed", entity_type="email",
                      entity_id=None, after={"to": to, "subject": subject, "error": str(e)[:300]})
            except Exception:
                pass
        return False


# ---------------------------------------------------------------------------
# Public API used by booking / payment / admin flows
# ---------------------------------------------------------------------------

def send_booking_received(db: "Session", booking: "Booking", access_token: str) -> None:
    """Customer: booking created, payment still pending. Includes one-time access link."""
    ctx = _booking_ctx(db, booking)
    cta = f"{ctx['frontend_url']}/booking/{booking.reference}?token={access_token}"
    subject, html, text = _render(
        "booking_received_subject", "booking_received_title", "booking_received_body", ctx,
        cta_url=cta, cta_label_key="pay_cta",
    )
    send_email(to=booking.customer_email, subject=subject, html=html, text=text, db=db)
    if settings.admin_email:
        _admin_notice(db, booking, event="New booking (pending payment)", extra=f"Access link issued.")


def send_payment_confirmed(db: "Session", booking: "Booking", payment: "Payment") -> None:
    """Customer + admin: payment verified; booking may now be confirmed."""
    ctx = _booking_ctx(db, booking, amount_paid=str(payment.amount))
    ctx["amount"] = str(payment.amount)
    cta = f"{ctx['frontend_url']}/booking/{booking.reference}"
    subject, html, text = _render(
        "payment_confirmed_subject", "payment_confirmed_title", "payment_confirmed_body", ctx,
        cta_url=cta, cta_label_key="view_booking",
    )
    send_email(to=booking.customer_email, subject=subject, html=html, text=text, db=db)
    if settings.admin_email:
        _admin_notice(
            db, booking, event="Payment received",
            extra=f"Paid {payment.amount} {payment.currency} ({payment.kind.value}). Booking status: {booking.status.value}",
        )


def send_booking_cancelled(db: "Session", booking: "Booking") -> None:
    """Customer + admin: booking cancelled by staff."""
    ctx = _booking_ctx(db, booking)
    subject, html, text = _render(
        "cancelled_subject", "cancelled_title", "cancelled_body", ctx,
    )
    send_email(to=booking.customer_email, subject=subject, html=html, text=text, db=db)
    if settings.admin_email:
        _admin_notice(db, booking, event="Booking cancelled", extra="")


def _admin_notice(db: "Session", booking: "Booking", *, event: str, extra: str) -> None:
    title = package_title(db, booking.package_id, "en")
    subject = f"[Leonard Tour] {event}: {booking.reference}"
    body = (
        f"{event}\n\n"
        f"Reference: {booking.reference}\n"
        f"Customer: {booking.customer_name} <{booking.customer_email}>\n"
        f"Phone: {booking.customer_phone or '—'}\n"
        f"Package: {title}\n"
        f"Travel date: {booking.travel_date}\n"
        f"Pax: {booking.adults} adults, {booking.children} children\n"
        f"Total: {booking.total_amount} {booking.currency}\n"
        f"Status: {booking.status.value}\n"
        f"Language: {booking.language}\n"
    )
    if extra:
        body += f"\n{extra}\n"
    html = f"<pre style='font-family:system-ui,sans-serif;white-space:pre-wrap'>{body}</pre>"
    send_email(to=settings.admin_email, subject=subject, html=html, text=body, db=db)
