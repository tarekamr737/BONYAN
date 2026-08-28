"""Add training plans and sessions.

Revision ID: 20260828_0003
Revises: 20260825_0002
Create Date: 2026-08-28 19:40:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260828_0003"
down_revision: str | None = "20260825_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "training_workout_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("goal", sa.String(length=40), nullable=False),
        sa.Column("experience", sa.String(length=40), nullable=False),
        sa.Column("days_per_week", sa.Integer(), nullable=False),
        sa.Column("session_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("equipment", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("generation_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("days", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_training_workout_plans_owner_id"), "training_workout_plans", ["owner_id"], unique=False)
    op.create_index(
        "ix_training_plans_owner_status_created",
        "training_workout_plans",
        ["owner_id", "status", "created_at"],
        unique=False,
    )
    op.create_table(
        "training_workout_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", sa.String(length=120), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("day_key", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("logged_sets", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("summary", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["plan_id"], ["training_workout_plans.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_training_workout_sessions_owner_id"), "training_workout_sessions", ["owner_id"], unique=False)
    op.create_index(op.f("ix_training_workout_sessions_plan_id"), "training_workout_sessions", ["plan_id"], unique=False)
    op.create_index(
        "ix_training_sessions_owner_status_started",
        "training_workout_sessions",
        ["owner_id", "status", "started_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_training_sessions_owner_status_started", table_name="training_workout_sessions")
    op.drop_index(op.f("ix_training_workout_sessions_plan_id"), table_name="training_workout_sessions")
    op.drop_index(op.f("ix_training_workout_sessions_owner_id"), table_name="training_workout_sessions")
    op.drop_table("training_workout_sessions")
    op.drop_index("ix_training_plans_owner_status_created", table_name="training_workout_plans")
    op.drop_index(op.f("ix_training_workout_plans_owner_id"), table_name="training_workout_plans")
    op.drop_table("training_workout_plans")
