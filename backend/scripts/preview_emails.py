"""Render every customer email in every language into ONE html gallery you can open in a browser.

    python -m scripts.preview_emails [output.html]

Uses sample data inside a database transaction that is rolled back (nothing is saved).
"""
import html
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.db import SessionLocal
from app.core.security import encrypt
from app.emails import builders
from app.emails.catalog import MESSAGES
from app.models import Booking, Package, Payment
from app.models.enums import BookingStatus, PaymentKind, PaymentMethod, PaymentStatus

LANG_NAMES = {"en": "English", "sw": "Kiswahili", "fr": "Français", "zh": "中文", "ko": "한국어"}
KINDS = [("booking_created", "Booking request"), ("payment_received", "Payment received"),
         ("booking_cancelled", "Cancelled"), ("balance_reminder", "Balance reminder")]


def main(out: str):
    db = SessionLocal()
    pkg_id = db.scalar(select(Package.id).limit(1))
    if pkg_id is None:
        sys.exit("No packages in the database. Run scripts.import_old_data first.")
    frames = {}
    for lang in MESSAGES:
        b = Booking(reference=f"MK-2026-A1B2{len(frames):02d}", package_id=pkg_id, public_token_enc=encrypt("sample-token-123"),
                    customer_name={"zh": "王小明", "ko": "김민수", "sw": "Asha Juma", "fr": "Claire Dubois"}.get(lang, "John Smith"),
                    customer_email="customer@example.com", language=lang, travel_date=date.today() + timedelta(days=45),
                    adults=2, children=1, currency="USD", total_amount=Decimal("3000"), deposit_amount=Decimal("900"),
                    status=BookingStatus.confirmed)
        db.add(b); db.flush()
        p = Payment(booking_id=b.id, provider="pesapal", merchant_reference=f"PREVIEW-{lang}", kind=PaymentKind.deposit,
                    method=PaymentMethod.card, amount=Decimal("900"), currency="USD", status=PaymentStatus.paid,
                    paid_at=datetime.now(timezone.utc))
        db.add(p); db.flush()
        for kind, _ in KINDS:
            entity = p.id if kind == "payment_received" else b.id
            frames[(lang, kind)] = builders.BUILDERS[kind](db, entity, {})[0].html
    db.rollback()
    tabs = "".join(f'<button onclick="show(\'{l}\')" id="b-{l}">{n}</button>' for l, n in LANG_NAMES.items())
    blocks = []
    for lang in MESSAGES:
        cards = "".join(f'<section><h3>{label}</h3><iframe sandbox srcdoc="{html.escape(frames[(lang, k)], quote=True)}"></iframe></section>'
                        for k, label in KINDS)
        blocks.append(f'<div class="lang" id="l-{lang}" style="display:none">{cards}</div>')
    page = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mangokili – email previews</title><style>
body{{margin:0;font-family:system-ui,'Noto Sans','Microsoft YaHei','Malgun Gothic',sans-serif;background:#e9e5da;color:#222}}
header{{position:sticky;top:0;background:#1f3d2b;padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;z-index:2}}
header b{{color:#f5e6c4;margin-right:12px}} button{{border:0;border-radius:6px;padding:8px 14px;font-size:15px;cursor:pointer;background:#f5e6c4}}
button.on{{background:#c8963e;font-weight:bold}} .lang{{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:18px;padding:18px}}
section h3{{margin:0 0 8px}} iframe{{width:100%;height:900px;border:1px solid #ccc;border-radius:8px;background:#fff}}
p.note{{margin:0;padding:10px 18px;background:#fff3cd;font-size:14px}}</style></head><body>
<header><b>Email previews</b>{tabs}</header>
<p class="note">Sample data only. Kiswahili, Français, 中文 and 한국어 texts are AI-drafted and must be reviewed by a native speaker before going live.</p>
{''.join(blocks)}
<script>function show(l){{document.querySelectorAll('.lang').forEach(e=>e.style.display='none');
document.getElementById('l-'+l).style.display='grid';document.querySelectorAll('header button').forEach(b=>b.classList.remove('on'));
document.getElementById('b-'+l).classList.add('on');}} show('en');</script></body></html>"""
    open(out, "w", encoding="utf-8").write(page)
    print(f"Wrote {out} ({len(page)//1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "email-preview.html")
