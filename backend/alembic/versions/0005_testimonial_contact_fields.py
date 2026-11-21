"""add guest contact and photo fields to testimonials"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("testimonials", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("testimonials", sa.Column("photo_path", sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column("testimonials", "photo_path")
    op.drop_column("testimonials", "email")
