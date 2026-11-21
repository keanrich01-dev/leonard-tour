from datetime import datetime, timezone
from decimal import Decimal
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import and_, delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import AuthContext, require_permission, verified_auth
from app.core.db import get_db
from app.core.permissions import permissions_for
from app.models import AuditLog, Booking, Inquiry, Package, PackagePrice, PackageTranslation, Payment
from app.models.enums import BookingStatus, PaymentStatus
from app.services.audit import audit
from app.services.media_storage import media_url, save_media, delete_media, MediaStorageError

router = APIRouter(prefix="/api/admin", tags=["admin-workspace"])


def _count(db: Session, model, *conditions) -> int:
    stmt = select(func.count()).select_from(model)
    if conditions:
        stmt = stmt.where(*conditions)
    return int(db.scalar(stmt) or 0)


def _month_start(year: int, month: int) -> datetime:
    return datetime(year, month, 1, tzinfo=timezone.utc)


def _recent_months(count: int = 6):
    now = datetime.now(timezone.utc)
    index = now.year * 12 + now.month - 1
    result = []
    for offset in reversed(range(count)):
        current = index - offset
        year, month0 = divmod(current, 12)
        result.append(_month_start(year, month0 + 1))
    return result


def _validate_price_tiers(tiers) -> None:
    seen = set()
    for tier in tiers or []:
        currency = tier.currency if hasattr(tier, "currency") else tier["currency"]
        pax_min = tier.pax_min if hasattr(tier, "pax_min") else tier["pax_min"]
        pax_max = tier.pax_max if hasattr(tier, "pax_max") else tier["pax_max"]
        if pax_max is not None and pax_max < pax_min:
            raise HTTPException(422, "Price tier maximum travellers cannot be below its minimum")
        key = (currency, pax_min)
        if key in seen:
            raise HTTPException(422, f"A {currency} price tier already exists for groups starting at {pax_min} travellers")
        seen.add(key)


def _validate_publish_ready(duration_days: int, title: str | None, overview: str | None, itinerary) -> None:
    if not (title or "").strip():
        raise HTTPException(422, "Add an English package title before publishing")
    if not (overview or "").strip():
        raise HTTPException(422, "Add a package overview before publishing")
    days = itinerary or []
    if len(days) != duration_days:
        raise HTTPException(422, f"The itinerary must contain exactly {duration_days} day entries before publishing")
    for index, day in enumerate(days, start=1):
        if not isinstance(day, dict) or not str(day.get("title", "")).strip() or not str(day.get("description", "")).strip():
            raise HTTPException(422, f"Complete the title and description for itinerary day {index}")


@router.get("/overview")
def overview(ctx: AuthContext = Depends(verified_auth), db: Session = Depends(get_db)):
    """Permission-aware operational snapshot for the Admin dashboard."""
    perms = permissions_for(ctx.user)
    can_bookings = "bookings.read" in perms
    can_inquiries = "inquiries.read" in perms
    can_packages = "packages.read" in perms
    can_payments = "payments.read" in perms
    can_reports = "reports.read" in perms
    can_audit = "audit.read" in perms

    data = {
        "bookings_total": _count(db, Booking) if can_bookings else None,
        "bookings_pending": _count(db, Booking, Booking.status == BookingStatus.pending) if can_bookings else None,
        "bookings_confirmed": _count(db, Booking, Booking.status == BookingStatus.confirmed) if can_bookings else None,
        "inquiries_new": _count(db, Inquiry, Inquiry.status == "new") if can_inquiries else None,
        "packages_published": _count(db, Package, Package.is_published.is_(True)) if can_packages else None,
        "packages_total": _count(db, Package) if can_packages else None,
        "payments_pending": _count(db, Payment, Payment.status == PaymentStatus.pending) if can_payments else None,
        "payments_paid": _count(db, Payment, Payment.status == PaymentStatus.paid,
                                 Payment.verified_with_provider.is_(True)) if can_payments else None,
        "revenue_received": None,
        "currency_note": "Multiple currencies are kept separate in payment records.",
        "bookings_by_month": [],
        "revenue_by_month": [],
        "popular_packages": [],
        "recent_bookings": [],
        "recent_activity": [],
        "permissions": sorted(perms),
    }

    months = _recent_months(6)
    start = months[0]
    month_map = {m.strftime("%Y-%m"): {"month": m.strftime("%b"), "value": 0} for m in months}

    if can_bookings:
        if can_reports:
            booking_month = func.date_trunc("month", Booking.created_at)
            rows = db.execute(
                select(booking_month, func.count(Booking.id))
                .where(Booking.created_at >= start)
                .group_by(booking_month)
                .order_by(booking_month)
            ).all()
            for month_value, value in rows:
                if month_value:
                    month_map[month_value.strftime("%Y-%m")]["value"] = int(value)
            data["bookings_by_month"] = list(month_map.values())

        recent = db.scalars(select(Booking).order_by(Booking.created_at.desc(), Booking.id.desc()).limit(6)).all()
        data["recent_bookings"] = [{
            "id": row.id, "reference": row.reference, "customer_name": row.customer_name,
            "customer_email": row.customer_email, "status": row.status.value,
            "travel_date": row.travel_date.isoformat() if row.travel_date else None,
            "total": str(row.total_amount), "currency": row.currency,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        } for row in recent]

    if can_payments:
        payment_month = func.date_trunc("month", Payment.paid_at)
        rows = db.execute(
            select(Payment.currency, payment_month, func.sum(Payment.amount))
            .where(Payment.status == PaymentStatus.paid, Payment.verified_with_provider.is_(True),
                   Payment.paid_at.is_not(None), Payment.paid_at >= start)
            .group_by(Payment.currency, payment_month)
            .order_by(Payment.currency, payment_month)
        ).all()
        revenue_by_currency = {}
        for currency, month_value, amount in rows:
            series = revenue_by_currency.setdefault(currency, {
                "currency": currency,
                "months": [{"month": m.strftime("%b"), "value": 0.0} for m in months],
            })
            if month_value:
                key = month_value.strftime("%Y-%m")
                index = next((i for i, m in enumerate(months) if m.strftime("%Y-%m") == key), None)
                if index is not None:
                    series["months"][index]["value"] = float(amount or 0)
        data["revenue_by_month"] = list(revenue_by_currency.values())
        totals = db.execute(
            select(Payment.currency, func.sum(Payment.amount))
            .where(Payment.status == PaymentStatus.paid, Payment.verified_with_provider.is_(True))
            .group_by(Payment.currency)
        ).all()
        data["revenue_received"] = [{"currency": currency, "amount": str(amount or Decimal("0"))}
                                    for currency, amount in totals]

    if can_bookings and can_packages and can_reports:
        rows = db.execute(
            select(Package.id, Package.slug, PackageTranslation.title, func.count(Booking.id).label("bookings"))
            .outerjoin(Booking, Booking.package_id == Package.id)
            .outerjoin(PackageTranslation, and_(PackageTranslation.package_id == Package.id,
                                                PackageTranslation.lang == "en"))
            .group_by(Package.id, Package.slug, PackageTranslation.title)
            .order_by(func.count(Booking.id).desc(), Package.id)
            .limit(5)
        ).all()
        data["popular_packages"] = [{"id": row.id, "slug": row.slug,
                                     "title": row.title or row.slug, "bookings": int(row.bookings)}
                                    for row in rows]

    if can_audit:
        rows = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(7)).all()
        data["recent_activity"] = [{"id": row.id, "action": row.action,
                                    "entity_type": row.entity_type, "entity_id": row.entity_id,
                                    "created_at": row.created_at.isoformat() if row.created_at else None}
                                   for row in rows]
    return data


@router.get("/inquiries")
def list_inquiries(status: str | None = None, q: str | None = Query(default=None, max_length=120),
                   limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
                   ctx: AuthContext = Depends(require_permission("inquiries.read")),
                   db: Session = Depends(get_db)):
    allowed = {"new", "in_progress", "replied", "converted", "closed"}
    if status and status not in allowed:
        raise HTTPException(422, "Invalid inquiry status")
    stmt = (select(Inquiry, PackageTranslation.title)
            .outerjoin(Package, Package.id == Inquiry.package_id)
            .outerjoin(PackageTranslation, and_(PackageTranslation.package_id == Package.id,
                                                PackageTranslation.lang == "en")))
    if status:
        stmt = stmt.where(Inquiry.status == status)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where((Inquiry.name.ilike(pattern)) | (Inquiry.email.ilike(pattern)) |
                          (Inquiry.message.ilike(pattern)))
    rows = db.execute(stmt.order_by(Inquiry.created_at.desc(), Inquiry.id.desc()).limit(limit).offset(offset)).all()
    return [{"id": row.id, "package_id": row.package_id, "package_title": title,
             "name": row.name, "email": row.email, "country": row.country,
             "whatsapp": row.whatsapp, "travelers": row.travelers, "message": row.message,
             "language": row.language, "status": row.status, "created_at": row.created_at.isoformat() if row.created_at else None}
            for row, title in rows]


class InquiryPatch(BaseModel):
    status: str = Field(pattern=r"^(new|in_progress|replied|converted|closed)$")


@router.patch("/inquiries/{inquiry_id}")
def update_inquiry(inquiry_id: int, body: InquiryPatch,
                   ctx: AuthContext = Depends(require_permission("inquiries.write")),
                   db: Session = Depends(get_db)):
    row = db.get(Inquiry, inquiry_id)
    if row is None:
        raise HTTPException(404, "Inquiry not found")
    before = {"status": row.status}
    if before["status"] != body.status:
        row.status = body.status
        audit(db, user_id=ctx.user.id, action="inquiry.update", entity_type="inquiry",
              entity_id=row.id, before=before, after={"status": row.status}, ip=ctx.ip)
        db.commit()
        db.refresh(row)
    return {"id": row.id, "status": row.status}


@router.get("/packages")
def list_admin_packages(limit: int = Query(200, ge=1, le=500),
                        ctx: AuthContext = Depends(require_permission("packages.read")),
                        db: Session = Depends(get_db)):
    rows = db.scalars(select(Package).options(selectinload(Package.translations), selectinload(Package.prices))
                      .order_by(Package.sort_order, Package.id).limit(limit)).all()
    result = []
    for p in rows:
        tr = next((x for x in p.translations if x.lang == "en"), p.translations[0] if p.translations else None)
        result.append({
            "id": p.id, "slug": p.slug, "category": p.category, "type": p.type,
            "duration_days": p.duration_days, "badge": p.badge, "hero_image": media_url(p.hero_image),
            "gallery_images": [media_url(x) for x in (p.gallery_images or [])], "is_published": p.is_published,
            "sort_order": p.sort_order, "title": tr.title if tr else p.slug,
            "overview": tr.overview if tr else None,
            "route": tr.route if tr else None,
            "destinations": tr.destinations or [] if tr else [],
            "itinerary": tr.itinerary or [] if tr else [],
            "itinerary_days": len(tr.itinerary or []) if tr else 0,
            "inclusions": tr.inclusions or [] if tr else [],
            "exclusions": tr.exclusions or [] if tr else [],
            "child_pricing_rules": p.child_pricing_rules or {},
            "price_from_usd": str(p.price_from_usd) if p.price_from_usd is not None else None,
            "price_from_tzs": str(p.price_from_tzs) if p.price_from_tzs is not None else None,
            "translations": [x.lang for x in p.translations],
            "pricing_options": [{"currency": price.currency, "pax_min": price.pax_min,
                                 "pax_max": price.pax_max,
                                 "amount_per_person": str(price.amount_per_person)} for price in p.prices],
        })
    return result


class PriceTierIn(BaseModel):
    currency: str = Field(pattern=r"^(USD|TZS|EUR)$")
    pax_min: int = Field(ge=1, le=100)
    pax_max: int | None = Field(default=None, ge=1, le=100)
    amount_per_person: Decimal = Field(gt=0, le=Decimal("999999999"))


class PackagePatch(BaseModel):
    slug: str | None = Field(default=None, min_length=3, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    category: str | None = Field(default=None, pattern=r"^(safari|climbing|beach)$")
    type: str | None = Field(default=None, min_length=2, max_length=30)
    duration_days: int | None = Field(default=None, ge=1, le=90)
    badge: str | None = Field(default=None, max_length=30)
    hero_image: str | None = Field(default=None, max_length=255)
    gallery_images: list[str] | None = None
    price_from_usd: Decimal | None = Field(default=None, ge=0)
    price_from_tzs: Decimal | None = Field(default=None, ge=0)
    sort_order: int | None = Field(default=None, ge=0, le=100000)
    is_published: bool | None = None
    child_pricing_rules: dict | None = None
    title: str | None = Field(default=None, min_length=2, max_length=200)
    route: str | None = Field(default=None, max_length=255)
    overview: str | None = Field(default=None, max_length=12000)
    destinations: list[str] | None = None
    itinerary: list[dict] | None = None
    inclusions: list[str] | None = None
    exclusions: list[str] | None = None
    pricing_options: list[PriceTierIn] | None = None


class PackageCreate(BaseModel):
    slug: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    category: str = Field(pattern=r"^(safari|climbing|beach)$")
    type: str = Field(min_length=2, max_length=30)
    duration_days: int = Field(ge=1, le=90)
    title: str = Field(min_length=2, max_length=200)
    badge: str | None = Field(default=None, max_length=30)
    hero_image: str | None = Field(default=None, max_length=255)
    gallery_images: list[str] = Field(default_factory=list)
    price_from_usd: Decimal | None = Field(default=None, ge=0)
    price_from_tzs: Decimal | None = Field(default=None, ge=0)
    sort_order: int = Field(default=0, ge=0, le=100000)
    is_published: bool = False
    route: str | None = Field(default=None, max_length=255)
    overview: str | None = Field(default=None, max_length=12000)
    destinations: list[str] = Field(default_factory=list)
    itinerary: list[dict] = Field(default_factory=list)
    inclusions: list[str] = Field(default_factory=list)
    exclusions: list[str] = Field(default_factory=list)
    child_pricing_rules: dict = Field(default_factory=dict)
    pricing_options: list[PriceTierIn] = Field(default_factory=list)


def _package_editor_out(p: Package) -> dict:
    tr = next((x for x in p.translations if x.lang == "en"), p.translations[0] if p.translations else None)
    return {
        "id": p.id, "slug": p.slug, "category": p.category, "type": p.type,
        "duration_days": p.duration_days, "badge": p.badge, "hero_image": media_url(p.hero_image),
        "gallery_images": [media_url(x) for x in (p.gallery_images or [])], "is_published": p.is_published,
        "sort_order": p.sort_order, "title": tr.title if tr else p.slug,
        "overview": tr.overview if tr else "", "route": tr.route if tr else None,
        "destinations": tr.destinations or [] if tr else [], "itinerary": tr.itinerary or [] if tr else [],
        "inclusions": tr.inclusions or [] if tr else [], "exclusions": tr.exclusions or [] if tr else [],
        "child_pricing_rules": p.child_pricing_rules or {},
        "price_from_usd": str(p.price_from_usd) if p.price_from_usd is not None else None,
        "price_from_tzs": str(p.price_from_tzs) if p.price_from_tzs is not None else None,
        "pricing_options": [{"currency": x.currency, "pax_min": x.pax_min,
                             "pax_max": x.pax_max, "amount_per_person": str(x.amount_per_person)}
                            for x in p.prices],
    }


@router.post("/packages", status_code=201)
def create_admin_package(body: PackageCreate,
                         ctx: AuthContext = Depends(require_permission("packages.write")),
                         db: Session = Depends(get_db)):
    if db.scalar(select(Package.id).where(Package.slug == body.slug)):
        raise HTTPException(409, "A package with this slug already exists")
    _validate_price_tiers(body.pricing_options)
    if body.is_published:
        _validate_publish_ready(body.duration_days, body.title, body.overview, body.itinerary)
    p = Package(slug=body.slug, category=body.category, type=body.type,
                duration_days=body.duration_days, badge=body.badge, hero_image=body.hero_image,
                gallery_images=body.gallery_images, child_pricing_rules=body.child_pricing_rules,
                price_from_usd=body.price_from_usd, price_from_tzs=body.price_from_tzs,
                is_published=body.is_published, sort_order=body.sort_order)
    db.add(p)
    db.flush()
    tr = PackageTranslation(package_id=p.id, lang="en", title=body.title,
                            route=body.route, overview=body.overview,
                            destinations=body.destinations, itinerary=body.itinerary,
                            inclusions=body.inclusions, exclusions=body.exclusions,
                            is_reviewed=False)
    db.add(tr)
    for tier in body.pricing_options:
        db.add(PackagePrice(package_id=p.id, currency=tier.currency, pax_min=tier.pax_min,
                            pax_max=tier.pax_max, amount_per_person=tier.amount_per_person))
    audit(db, user_id=ctx.user.id, action="package.create", entity_type="package", entity_id=p.id,
          after={"slug": p.slug, "category": p.category, "title": body.title}, ip=ctx.ip)
    db.commit()
    p = db.scalar(select(Package).options(selectinload(Package.translations), selectinload(Package.prices))
                  .where(Package.id == p.id))
    return _package_editor_out(p)


@router.get("/packages/{package_id}")
def get_admin_package(package_id: int,
                      ctx: AuthContext = Depends(require_permission("packages.read")),
                      db: Session = Depends(get_db)):
    p = db.scalar(select(Package).options(selectinload(Package.translations), selectinload(Package.prices))
                  .where(Package.id == package_id))
    if p is None:
        raise HTTPException(404, "Package not found")
    return _package_editor_out(p)


@router.patch("/packages/{package_id}")
def update_admin_package(package_id: int, body: PackagePatch,
                         ctx: AuthContext = Depends(require_permission("packages.write")),
                         db: Session = Depends(get_db)):
    p = db.scalar(select(Package).options(selectinload(Package.translations), selectinload(Package.prices))
                  .where(Package.id == package_id))
    if p is None:
        raise HTTPException(404, "Package not found")
    values = body.model_dump(exclude_unset=True)
    if "slug" in values and values["slug"] != p.slug and db.scalar(select(Package.id).where(Package.slug == values["slug"])):
        raise HTTPException(409, "A package with this slug already exists")
    tr = next((x for x in p.translations if x.lang == "en"), None)
    translation_fields = {"title", "route", "overview", "destinations", "itinerary", "inclusions", "exclusions"}
    translation_before = {key: getattr(tr, key) for key in translation_fields} if tr else {}
    before = {key: (str(getattr(p, key)) if isinstance(getattr(p, key), Decimal) else getattr(p, key))
              for key in values if key not in translation_fields | {"pricing_options"}}
    if any(key in values for key in translation_fields) and tr is None:
        tr = PackageTranslation(package_id=p.id, lang="en", title=values.get("title") or p.slug,
                                route=None, overview=None, destinations=[], itinerary=[],
                                inclusions=[], exclusions=[], is_reviewed=False)
        db.add(tr)
    for key, value in values.items():
        if key in translation_fields:
            setattr(tr, key, value)
        elif key == "pricing_options":
            continue
        else:
            setattr(p, key, value)
    if p.is_published:
        _validate_publish_ready(p.duration_days, tr.title if tr else None,
                                tr.overview if tr else None, tr.itinerary if tr else [])
    if "pricing_options" in values:
        tiers = values["pricing_options"] or []
        _validate_price_tiers(tiers)
        db.execute(delete(PackagePrice).where(PackagePrice.package_id == p.id))
        for tier in tiers:
            db.add(PackagePrice(package_id=p.id, currency=tier["currency"], pax_min=tier["pax_min"],
                                pax_max=tier["pax_max"], amount_per_person=tier["amount_per_person"]))
    after = {key: (str(getattr(p, key)) if isinstance(getattr(p, key), Decimal) else getattr(p, key))
             for key in before}
    if tr is not None and any(key in values for key in translation_fields):
        changed_translation = {key for key in translation_fields if key in values}
        before["translation"] = {key: translation_before.get(key) for key in changed_translation}
        after["translation"] = {key: getattr(tr, key) for key in changed_translation}
    if "pricing_options" in values:
        before["pricing_options"] = [{"currency": x.currency, "pax_min": x.pax_min,
                                      "pax_max": x.pax_max, "amount_per_person": str(x.amount_per_person)}
                                     for x in p.prices]
        after["pricing_options"] = [{"currency": x.currency, "pax_min": x.pax_min,
                                     "pax_max": x.pax_max, "amount_per_person": str(x.amount_per_person)}
                                    for x in (values["pricing_options"] or [])]
    if before != after:
        audit(db, user_id=ctx.user.id, action="package.update", entity_type="package",
              entity_id=p.id, before=before, after=after, ip=ctx.ip)
    db.commit()
    p = db.scalar(select(Package).options(selectinload(Package.translations), selectinload(Package.prices))
                  .where(Package.id == p.id))
    return _package_editor_out(p)


@router.post("/packages/media")
async def upload_package_media(file: UploadFile = File(...),
                               ctx: AuthContext = Depends(require_permission("packages.write")),
                               db: Session = Depends(get_db)):
    content = await file.read(8 * 1024 * 1024 + 1)
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(413, "Package image must not exceed 8 MB")
    if content.startswith(b"\xff\xd8\xff"):
        extension = "jpg"
    elif content.startswith(b"\x89PNG\r\n\x1a\n"):
        extension = "png"
    elif len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        extension = "webp"
    else:
        raise HTTPException(415, "Upload a valid JPG, PNG or WEBP image")
    name = f"{uuid.uuid4().hex}.{extension}"
    object_key = f"packages/{name}"
    mime = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[extension]
    try:
        save_media(object_key, content, mime)
        media_path = media_url(object_key)
        audit(db, user_id=ctx.user.id, action="package.media_upload", entity_type="package_media",
              entity_id=name, after={"path": media_path, "bytes": len(content), "content_type": mime},
              ip=ctx.ip)
        db.commit()
    except MediaStorageError as exc:
        db.rollback()
        raise HTTPException(503, "Media storage is temporarily unavailable.") from exc
    except Exception:
        db.rollback()
        try:
            delete_media(object_key)
        except MediaStorageError:
            pass
        raise
    return {"path": media_path, "url": media_path}
