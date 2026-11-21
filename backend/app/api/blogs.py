import re
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_permission
from app.core.db import get_db
from app.models import BlogPost
from app.services.audit import audit
from app.services.media_storage import media_url, save_media, MediaStorageError

router = APIRouter(tags=["blogs"])
BLOG_CATEGORIES = {
    "Safari Tips", "Tanzania Destinations", "Kilimanjaro Adventures", "Travel Guides"
}
LANGUAGES = {"en", "sw", "fr", "zh", "ko"}
MAX_IMAGE_BYTES = 6 * 1024 * 1024


def _out(row: BlogPost, *, detail: bool = False) -> dict:
    result = {
        "id": row.id,
        "title": row.title,
        "slug": row.slug,
        "excerpt": row.excerpt,
        "category": row.category,
        "language": row.language,
        "featured_image": media_url(row.featured_image),
        "is_featured": row.is_featured,
        "status": row.status,
        "seo_title": row.seo_title,
        "seo_description": row.seo_description,
        "published_at": row.published_at.isoformat() if row.published_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }
    if detail:
        result["content"] = row.content
    return result


class BlogPostCreate(BaseModel):
    title: str = Field(min_length=3, max_length=220)
    slug: str = Field(min_length=3, max_length=240, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    excerpt: str = Field(default="", max_length=500)
    content: str = Field(min_length=20, max_length=50000)
    category: str = Field(default="Travel Guides", max_length=60)
    language: Literal["en", "sw", "fr", "zh", "ko"] = "en"
    featured_image: str | None = Field(default=None, max_length=255)
    is_featured: bool = False
    status: Literal["draft", "published"] = "draft"
    seo_title: str | None = Field(default=None, max_length=220)
    seo_description: str | None = Field(default=None, max_length=320)


class BlogPostPatch(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=220)
    slug: str | None = Field(default=None, min_length=3, max_length=240, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    excerpt: str | None = Field(default=None, max_length=500)
    content: str | None = Field(default=None, min_length=20, max_length=50000)
    category: str | None = Field(default=None, max_length=60)
    language: Literal["en", "sw", "fr", "zh", "ko"] | None = None
    featured_image: str | None = Field(default=None, max_length=255)
    is_featured: bool | None = None
    status: Literal["draft", "published"] | None = None
    seo_title: str | None = Field(default=None, max_length=220)
    seo_description: str | None = Field(default=None, max_length=320)


def _validate_category(category: str) -> None:
    if category not in BLOG_CATEGORIES:
        raise HTTPException(422, "Choose one of the supported blog categories.")


@router.get("/api/blogs")
def public_blog_list(
    lang: str = Query("en", pattern=r"^(en|sw|fr|zh|ko)$"),
    category: str | None = Query(default=None, max_length=60),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    stmt = select(BlogPost).where(BlogPost.status == "published", BlogPost.language == lang)
    if category:
        stmt = stmt.where(BlogPost.category == category)
    rows = db.scalars(stmt.order_by(BlogPost.is_featured.desc(), BlogPost.published_at.desc(), BlogPost.id.desc()).limit(limit)).all()
    return [_out(row) for row in rows]


@router.get("/api/blogs/{slug}")
def public_blog_detail(slug: str, db: Session = Depends(get_db)):
    row = db.scalar(select(BlogPost).where(BlogPost.slug == slug, BlogPost.status == "published"))
    if row is None:
        raise HTTPException(404, "Article not found")
    return _out(row, detail=True)


@router.get("/api/admin/blogs")
def admin_blog_list(
    status: Literal["draft", "published"] | None = None,
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(100, ge=1, le=200),
    ctx: AuthContext = Depends(require_permission("blogs.manage")),
    db: Session = Depends(get_db),
):
    stmt = select(BlogPost)
    if status:
        stmt = stmt.where(BlogPost.status == status)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where((BlogPost.title.ilike(pattern)) | (BlogPost.slug.ilike(pattern)))
    rows = db.scalars(stmt.order_by(BlogPost.updated_at.desc(), BlogPost.id.desc()).limit(limit)).all()
    return [_out(row, detail=True) for row in rows]


@router.post("/api/admin/blogs", status_code=201)
def create_blog_post(
    body: BlogPostCreate,
    ctx: AuthContext = Depends(require_permission("blogs.manage")),
    db: Session = Depends(get_db),
):
    _validate_category(body.category)
    existing = db.scalar(select(BlogPost.id).where(BlogPost.slug == body.slug))
    if existing:
        raise HTTPException(409, "That article URL is already in use. Choose another slug.")
    now = datetime.now(timezone.utc)
    row = BlogPost(
        **body.model_dump(),
        created_by=ctx.user.id,
        published_at=now if body.status == "published" else None,
    )
    db.add(row)
    try:
        db.flush()
        audit(db, user_id=ctx.user.id, action="blog.create", entity_type="blog_post", entity_id=row.id,
              after={"slug": row.slug, "status": row.status}, ip=ctx.ip)
        db.commit()
        db.refresh(row)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "That article URL is already in use.") from exc
    return _out(row, detail=True)


@router.patch("/api/admin/blogs/{post_id}")
def update_blog_post(
    post_id: int,
    body: BlogPostPatch,
    ctx: AuthContext = Depends(require_permission("blogs.manage")),
    db: Session = Depends(get_db),
):
    row = db.get(BlogPost, post_id)
    if row is None:
        raise HTTPException(404, "Article not found")
    changes = body.model_dump(exclude_unset=True)
    required_fields = ("title", "slug", "excerpt", "content", "category", "language", "status", "is_featured")
    for field_name in required_fields:
        if field_name in changes and changes[field_name] is None:
            raise HTTPException(422, f"Article field '{field_name}' cannot be null.")
    if "category" in changes:
        _validate_category(changes["category"])
    if "slug" in changes and changes["slug"] != row.slug:
        duplicate = db.scalar(select(BlogPost.id).where(BlogPost.slug == changes["slug"], BlogPost.id != row.id))
        if duplicate:
            raise HTTPException(409, "That article URL is already in use.")
    before = {key: getattr(row, key) for key in changes}
    for key, value in changes.items():
        setattr(row, key, value)
    if changes.get("status") == "published" and row.published_at is None:
        row.published_at = datetime.now(timezone.utc)
    after = {key: getattr(row, key) for key in changes}
    if before != after:
        audit(db, user_id=ctx.user.id, action="blog.update", entity_type="blog_post", entity_id=row.id,
              before={k: str(v) if isinstance(v, datetime) else v for k, v in before.items()},
              after={k: str(v) if isinstance(v, datetime) else v for k, v in after.items()}, ip=ctx.ip)
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "The article could not be saved because its URL is already in use.") from exc
    return _out(row, detail=True)


@router.post("/api/admin/blogs/media", status_code=201)
async def upload_blog_image(
    photo: UploadFile = File(...),
    ctx: AuthContext = Depends(require_permission("blogs.manage")),
):
    content = await photo.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Featured image must not exceed 6 MB.")
    if content.startswith(b"\xff\xd8\xff"):
        ext = "jpg"
    elif content.startswith(b"\x89PNG\r\n\x1a\n"):
        ext = "png"
    elif len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        ext = "webp"
    else:
        raise HTTPException(415, "Choose a valid JPG, PNG or WEBP image.")
    filename = f"{uuid.uuid4().hex}.{ext}"
    object_key = f"blogs/{filename}"
    mime = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[ext]
    try:
        save_media(object_key, content, mime)
    except MediaStorageError as exc:
        raise HTTPException(503, "Image storage is temporarily unavailable.") from exc
    return {"image_url": media_url(object_key)}
