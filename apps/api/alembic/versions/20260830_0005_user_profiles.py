"""Add user profiles and onboarding preferences.

Revision ID: 20260830_0005
Revises: 20260829_0004
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260830_0005"
down_revision: str | None = "20260829_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("owner_id", sa.String(length=120), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=True),
        sa.Column("preferred_language", sa.String(length=16), server_default="en", nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("sex", sa.String(length=20), nullable=True),
        sa.Column("height_cm", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("training_goal", sa.String(length=40), nullable=True),
        sa.Column("experience_level", sa.String(length=40), nullable=True),
        sa.Column("available_training_days", sa.Integer(), nullable=True),
        sa.Column(
            "available_equipment",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("preferred_units", sa.String(length=10), server_default="metric", nullable=False),
        sa.Column("timezone", sa.String(length=64), server_default="UTC", nullable=False),
        sa.Column("onboarding_completed", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "available_training_days IS NULL OR available_training_days BETWEEN 2 AND 6",
            name=op.f("ck_user_profiles_training_days_range"),
        ),
        sa.CheckConstraint(
            "height_cm IS NULL OR height_cm BETWEEN 80 AND 250",
            name=op.f("ck_user_profiles_height_cm_range"),
        ),
        sa.CheckConstraint(
            "sex IS NULL OR sex IN ('female', 'male', 'unspecified')",
            name=op.f("ck_user_profiles_sex_value"),
        ),
        sa.CheckConstraint(
            "training_goal IS NULL OR training_goal IN "
            "('strength', 'hypertrophy', 'fat_loss', 'general_fitness')",
            name=op.f("ck_user_profiles_training_goal_value"),
        ),
        sa.CheckConstraint(
            "experience_level IS NULL OR experience_level IN "
            "('beginner', 'intermediate', 'advanced')",
            name=op.f("ck_user_profiles_experience_level_value"),
        ),
        sa.CheckConstraint(
            "preferred_units IN ('metric', 'imperial')",
            name=op.f("ck_user_profiles_preferred_units_value"),
        ),
        sa.PrimaryKeyConstraint("owner_id", name=op.f("pk_user_profiles")),
    )


def downgrade() -> None:
    op.drop_table("user_profiles")
