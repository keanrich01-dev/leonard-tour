"""Add age-based child pricing and booking price snapshots.

Revision ID: 0007
Revises: 0006
"""
import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


SAFARI_CHILD_RULES = {
    "version": 1,
    "provisional": True,
    "bands": [
        {"min_age": 0, "max_age": 4, "factor": 0.50, "label": "Young child (0–4)"},
        {"min_age": 5, "max_age": 15, "factor": 0.75, "label": "Child (5–15)"},
    ],
    "note": "Proposed launch offers. Confirm park, lodge, accommodation and supplier child charges before production launch.",
}

MOUNTAIN_CHILD_RULES = {
    "version": 1,
    "provisional": True,
    "bands": [
        {"min_age": 0, "max_age": 4, "factor": 1.00, "label": "Route review required"},
        {"min_age": 5, "max_age": 15, "factor": 1.00, "label": "Route review required"},
    ],
    "note": "Mountain trek child eligibility and rates require route-specific operator confirmation before production launch.",
}


def upgrade() -> None:
    op.add_column(
        "packages",
        sa.Column(
            "child_pricing_rules",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "bookings",
        sa.Column(
            "child_ages",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "bookings",
        sa.Column(
            "price_breakdown",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )

    conn = op.get_bind()
    conn.execute(
        sa.text("UPDATE packages SET child_pricing_rules = CAST(:rules AS JSONB) WHERE category IN ('safari', 'beach')"),
        {"rules": json.dumps(SAFARI_CHILD_RULES)},
    )
    conn.execute(
        sa.text("UPDATE packages SET child_pricing_rules = CAST(:rules AS JSONB) WHERE category = 'climbing'"),
        {"rules": json.dumps(MOUNTAIN_CHILD_RULES)},
    )


def downgrade() -> None:
    op.drop_column("bookings", "price_breakdown")
    op.drop_column("bookings", "child_ages")
    op.drop_column("packages", "child_pricing_rules")
