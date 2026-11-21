import re
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import Literal

from app.api.deps import AuthContext, require_permission
from app.core.db import get_db
from app.core.ratelimit import limiter
from app.models import Testimonial
from app.services import notify
from app.services.audit import audit
from app.services.media_storage import media_url, save_media, delete_media, MediaStorageError

router = APIRouter(tags=["testimonials"])
MAX_PHOTO_BYTES = 4 * 1024 * 1024


def _photo_extension(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return None


def _public_out(row: Testimonial) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "country": row.country,
        "rating": row.rating,
        "message": row.message,
        "photo_url": media_url(row.photo_path),
        "created_at": row.created_at,
    }


def _admin_out(row: Testimonial) -> dict:
    return {
        **_public_out(row),
        "email": row.email,
        "is_approved": row.is_approved,
        "moderation_status": getattr(row, "moderation_status", None) or ("approved" if row.is_approved else "pending"),
        "lang": row.lang,
    }


@router.get("/api/testimonials")
def list_public_testimonials(
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Only approved reviews are public; newest approved reviews are displayed first."""
    rows = db.scalars(
        select(Testimonial)
        .where(Testimonial.is_approved.is_(True))
        .order_by(Testimonial.created_at.desc(), Testimonial.id.desc())
        .limit(limit)
    ).all()
    return [_public_out(row) for row in rows]


@router.post("/api/testimonials", status_code=201)
async def submit_testimonial(
    request: Request,
    name: str = Form(..., min_length=2, max_length=160),
    email: str = Form(..., max_length=255),
    country: str = Form(..., min_length=2, max_length=80),
    rating: int = Form(5, ge=1, le=5),
    message: str = Form(..., min_length=10, max_length=2000),
    lang: Literal["en", "sw", "fr", "zh", "ko"] = Form("en"),
    photo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else "unknown"
    if not limiter.hit(f"testimonial-submit:{ip}", limit=5, window_seconds=3600):
        raise HTTPException(429, "Too many review submissions. Please try again later.")

    name = name.strip()
    email = email.strip().lower()
    country = country.strip()
    message = message.strip()
    if len(name) < 2 or len(country) < 2 or len(message) < 10:
        raise HTTPException(422, "Please complete all required fields with valid information.")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(422, "Please enter a valid email address.")

    stored_path = None
    if photo is not None and photo.filename:
        content = await photo.read(MAX_PHOTO_BYTES + 1)
        if len(content) > MAX_PHOTO_BYTES:
            raise HTTPException(413, "Profile photo must not exceed 4 MB.")
        extension = _photo_extension(content)
        if extension is None:
            raise HTTPException(415, "Profile photo must be a valid JPG, PNG or WEBP image.")
        filename = f"{uuid.uuid4().hex}.{extension}"
        stored_path = f"testimonials/{filename}"
        mime = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[extension]
        try:
            save_media(stored_path, content, mime)
        except MediaStorageError as exc:
            raise HTTPException(503, "Photo storage is temporarily unavailable.") from exc

    row = Testimonial(
        name=name,
        email=email,
        country=country,
        photo_path=stored_path,
        rating=rating,
        message=message,
        lang=lang,
        is_approved=False,
        moderation_status="pending",
    )
    try:
        db.add(row)
        db.commit()
        db.refresh(row)
    except Exception:
        db.rollback()
        if stored_path:
            try:
                delete_media(stored_path)
            except MediaStorageError:
                pass
        raise

    # Notify company staff using the existing Celery/email pipeline. Email failure never blocks submission.
    notify.enqueue_email("admin_new_testimonial", row.id)
    return {
        "id": row.id,
        "status": "pending",
        "message": "Thank you. Your review has been submitted and is awaiting approval.",
        "review": _public_out(row),
    }


class TestimonialModeration(BaseModel):
    status: Literal["pending", "approved", "rejected"] | None = None
    is_approved: bool | None = None

    @model_validator(mode="after")
    def require_action(self):
        if self.status is None and self.is_approved is None:
            raise ValueError("Choose a moderation status.")
        return self


@router.get("/api/admin/testimonials")
def list_admin_testimonials(
    status: Literal["pending", "approved", "rejected", "all"] = "all",
    is_approved: bool | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    ctx: AuthContext = Depends(require_permission("testimonials.moderate")),
    db: Session = Depends(get_db),
):
    q = select(Testimonial).order_by(Testimonial.created_at.desc(), Testimonial.id.desc())
    if status != "all":
        q = q.where(Testimonial.moderation_status == status)
    elif is_approved is not None:
        # Compatibility for older Admin clients still using the boolean filter.
        q = q.where(Testimonial.is_approved.is_(is_approved))
    q = q.limit(limit).offset(offset)
    return [_admin_out(row) for row in db.scalars(q)]


@router.patch("/api/admin/testimonials/{testimonial_id}")
def moderate_testimonial(
    testimonial_id: int,
    body: TestimonialModeration,
    ctx: AuthContext = Depends(require_permission("testimonials.moderate")),
    db: Session = Depends(get_db),
):
    row = db.get(Testimonial, testimonial_id)
    if row is None:
        raise HTTPException(404, "Testimonial not found")

    before = {
        "is_approved": row.is_approved,
        "moderation_status": getattr(row, "moderation_status", None) or ("approved" if row.is_approved else "pending"),
    }
    next_status = body.status
    if next_status is None:
        # Backward compatibility: old false meant hide pending approval, not reject.
        next_status = "approved" if body.is_approved else "pending"
    row.moderation_status = next_status
    row.is_approved = next_status == "approved"
    after = {"is_approved": row.is_approved, "moderation_status": row.moderation_status}
    if before != after:
        audit(
            db,
            user_id=ctx.user.id,
            action="testimonial.moderate",
            entity_type="testimonial",
            entity_id=row.id,
            before=before,
            after=after,
            ip=ctx.ip,
        )
    db.commit()
    db.refresh(row)
    return _admin_out(row)
