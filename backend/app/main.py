from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.db import get_db
from app.models import Package
from app.api import (admin_auth, admin_bookings, admin_users, admin_workspace, bookings,
                     payments_ipn, testimonials, newsletter, package_actions, blogs)
from app.models.enums import LANGUAGES
from app.services.media_storage import media_url

app = FastAPI(title="Leonard Tour API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list,
                   allow_methods=["GET", "POST", "PATCH"], allow_headers=["Content-Type", "X-CSRF-Token", "X-Booking-Token"],
                   allow_credentials=True)


@app.middleware("http")
async def security_headers(request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Cache-Control"] = "no-store" if request.url.path.startswith("/api/admin") else resp.headers.get("Cache-Control", "no-cache")
    if request.url.path.startswith("/media/"):
        resp.headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; frame-ancestors 'none'"
    elif not request.url.path.startswith(("/docs", "/redoc", "/openapi")):
        resp.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    if settings.cookie_secure:
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return resp


app.include_router(admin_auth.router)
app.include_router(admin_users.router)
app.include_router(admin_bookings.router)
app.include_router(admin_workspace.router)
app.include_router(bookings.router)
app.include_router(package_actions.router)
app.include_router(payments_ipn.router)
app.include_router(testimonials.router)
app.include_router(newsletter.router)
app.include_router(blogs.router)

MEDIA_DIR = Path(__file__).resolve().parents[1] / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("select 1"))
    return {"status": "ok"}


def _serialize(p: Package, lang: str, detail: bool):
    tr = next((t for t in p.translations if t.lang == lang), None) or \
         next((t for t in p.translations if t.lang == "en"), None)
    if tr is None:
        return None
    out = {
        "slug": p.slug, "category": p.category, "type": p.type, "days": p.duration_days,
        "badge": p.badge, "image": media_url(p.hero_image), "gallery_images": [media_url(x) for x in (p.gallery_images or [])],
        "price_from": {"USD": p.price_from_usd and float(p.price_from_usd),
                       "TZS": p.price_from_tzs and float(p.price_from_tzs)},
        "lang": tr.lang, "title": tr.title, "route": tr.route,
    }
    if detail:
        out.update(
            overview=tr.overview,
            destinations=tr.destinations,
            itinerary=tr.itinerary,
            inclusions=tr.inclusions,
            exclusions=tr.exclusions,
            pricing_options=[{
                "currency": row.currency,
                "pax_min": row.pax_min,
                "pax_max": row.pax_max,
                "amount_per_person": float(row.amount_per_person),
            } for row in p.prices],
            child_pricing_rules=p.child_pricing_rules or {},
        )
    return out


@app.get("/api/packages")
def list_packages(lang: str = Query("en"), category: str | None = None, db: Session = Depends(get_db)):
    if lang not in LANGUAGES:
        raise HTTPException(400, f"lang must be one of {LANGUAGES}")
    q = select(Package).options(selectinload(Package.translations)).where(Package.is_published.is_(True))
    if category:
        q = q.where(Package.category == category)
    rows = db.scalars(q.order_by(Package.sort_order, Package.id)).all()
    return [s for s in (_serialize(p, lang, False) for p in rows) if s]


@app.get("/api/packages/{slug}")
def get_package(slug: str, lang: str = Query("en"), db: Session = Depends(get_db)):
    if lang not in LANGUAGES:
        raise HTTPException(400, f"lang must be one of {LANGUAGES}")
    p = db.scalar(select(Package).options(selectinload(Package.translations), selectinload(Package.prices))
                  .where(Package.slug == slug, Package.is_published.is_(True)))
    s = p and _serialize(p, lang, True)
    if not s:
        raise HTTPException(404, "Package not found")
    return s


@app.get("/api/payments/availability")
def payment_availability():
    """Public, non-secret capabilities. Actual channels depend on company merchant activation."""
    configured = bool(
        settings.payment_provider == "pesapal"
        and settings.pesapal_consumer_key.strip()
        and settings.pesapal_consumer_secret.strip()
    )
    return {
        "provider": settings.payment_provider,
        "configured": configured,
        "checkout_type": "hosted",
        "selection_location": "provider_checkout",
        "merchant_activation_required": True,
        "methods": [
            {"code": "visa", "label": "Visa"},
            {"code": "mastercard", "label": "Mastercard"},
            {"code": "mpesa", "label": "Vodacom M-Pesa"},
            {"code": "airtel_money", "label": "Airtel Money"},
        ],
    }
