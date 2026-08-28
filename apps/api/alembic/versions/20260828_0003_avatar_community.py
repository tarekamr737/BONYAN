"""Add avatar and community persistence.

Revision ID: 20260828_0003
Revises: 20260825_0002
Create Date: 2026-08-28 16:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.domains.avatar.migration import downgrade as downgrade_avatar
from app.domains.avatar.migration import upgrade as upgrade_avatar
from app.domains.community.migration import downgrade as downgrade_community
from app.domains.community.migration import upgrade as upgrade_community

revision: str = "20260828_0003"
down_revision: str | None = "20260825_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    upgrade_avatar(op)
    op.create_table(
        "avatar_manual_body_metrics",
        sa.Column("owner_id", sa.String(length=128), nullable=False),
        sa.Column("height_cm", sa.Float(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=False),
        sa.Column("body_fat_percentage", sa.Float(), nullable=True),
        sa.Column("skeletal_muscle_mass_kg", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("owner_id", name="pk_avatar_manual_body_metrics"),
    )
    upgrade_community(op)


def downgrade() -> None:
    downgrade_community(op)
    op.drop_table("avatar_manual_body_metrics")
    downgrade_avatar(op)
