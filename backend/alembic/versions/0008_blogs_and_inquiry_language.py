"""Add blog CMS storage and inquiry language."""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "inquiries",
        sa.Column("language", sa.String(length=5), nullable=False, server_default="en"),
    )
    op.add_column(
        "testimonials",
        sa.Column("moderation_status", sa.String(length=12), nullable=False, server_default="pending"),
    )
    op.execute("UPDATE testimonials SET moderation_status = 'approved' WHERE is_approved IS TRUE")
    op.create_index("ix_testimonials_moderation_status", "testimonials", ["moderation_status"], unique=False)
    op.create_table(
        "blog_posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("slug", sa.String(length=240), nullable=False),
        sa.Column("excerpt", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False, server_default="Travel Guides"),
        sa.Column("language", sa.String(length=5), nullable=False, server_default="en"),
        sa.Column("featured_image", sa.String(length=255), nullable=True),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="draft"),
        sa.Column("seo_title", sa.String(length=220), nullable=True),
        sa.Column("seo_description", sa.String(length=320), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("slug", name="uq_blog_posts_slug"),
    )
    op.create_index("ix_blog_posts_status", "blog_posts", ["status"], unique=False)
    op.create_index("ix_blog_posts_status_published_at", "blog_posts", ["status", "published_at"], unique=False)
    op.create_index("ix_blog_posts_category_status", "blog_posts", ["category", "status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_blog_posts_category_status", table_name="blog_posts")
    op.drop_index("ix_blog_posts_status_published_at", table_name="blog_posts")
    op.drop_index("ix_blog_posts_status", table_name="blog_posts")
    op.drop_table("blog_posts")
    op.drop_index("ix_testimonials_moderation_status", table_name="testimonials")
    op.drop_column("testimonials", "moderation_status")
    op.drop_column("inquiries", "language")
