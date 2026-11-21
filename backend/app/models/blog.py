from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class BlogPost(Base):
    __tablename__ = "blog_posts"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_blog_posts_slug"),
        Index("ix_blog_posts_status", "status"),
        Index("ix_blog_posts_status_published_at", "status", "published_at"),
        Index("ix_blog_posts_category_status", "category", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    slug: Mapped[str] = mapped_column(String(240), nullable=False)
    excerpt: Mapped[str] = mapped_column(String(500), nullable=False, default="", server_default="")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False, default="Travel Guides", server_default="Travel Guides")
    language: Mapped[str] = mapped_column(String(5), nullable=False, default="en", server_default="en")
    featured_image: Mapped[str | None] = mapped_column(String(255))
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    status: Mapped[str] = mapped_column(String(12), nullable=False, default="draft", server_default="draft")
    seo_title: Mapped[str | None] = mapped_column(String(220))
    seo_description: Mapped[str | None] = mapped_column(String(320))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
