"""Persist Home tour state and Coach conversation history.

Revision ID: 20260921_0013
Revises: 20260920_0012
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260921_0013"
down_revision: str | None = "20260920_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user_profiles",
        sa.Column("home_tour_completed", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column(
        "user_profiles",
        sa.Column("home_tour_completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "training_coach_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("model", sa.String(length=160), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("role IN ('user', 'coach')", name="ck_training_coach_messages_role"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_training_coach_messages")),
    )
    op.create_index(
        op.f("ix_training_coach_messages_owner_id"),
        "training_coach_messages",
        ["owner_id"],
    )
    op.create_index(
        "ix_training_coach_owner_created",
        "training_coach_messages",
        ["owner_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_training_coach_owner_created", table_name="training_coach_messages")
    op.drop_index(op.f("ix_training_coach_messages_owner_id"), table_name="training_coach_messages")
    op.drop_table("training_coach_messages")
    op.drop_column("user_profiles", "home_tour_completed_at")
    op.drop_column("user_profiles", "home_tour_completed")
