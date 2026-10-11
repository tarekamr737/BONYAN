"""V2 canonical session prescriptions, versioned proposals and approval audit.

Revision ID: 20261011_0014
Revises: 20260921_0013
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261011_0014"
down_revision = "20260921_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "training_workout_sessions",
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "training_workout_sessions", sa.Column("prescription_snapshot", postgresql.JSONB())
    )
    # Snapshot existing sessions without rewriting logs or minting historical awards.
    op.execute("""UPDATE training_workout_sessions AS s
        SET prescription_snapshot = d.value FROM training_workout_plans AS p,
        LATERAL jsonb_array_elements(p.days) AS d(value)
        WHERE p.id = s.plan_id AND d.value->>'key' = s.day_key""")
    op.create_table(
        "training_substitution_proposals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", sa.String(120), nullable=False),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("training_workout_sessions.id"),
            nullable=False,
        ),
        sa.Column("prescription_index", sa.Integer(), nullable=False),
        sa.Column("expected_version", sa.Integer(), nullable=False),
        sa.Column("scope", sa.String(16), nullable=False),
        sa.Column("reason", sa.String(24), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("original", postgresql.JSONB(), nullable=False),
        sa.Column("candidate", postgresql.JSONB(), nullable=False),
        sa.Column("available_equipment", postgresql.JSONB(), nullable=False),
        sa.Column("media_available", sa.Boolean(), nullable=False),
        sa.Column("approval_key", sa.String(120)),
        sa.Column("result", postgresql.JSONB()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("owner_id", "approval_key", name="uq_substitution_owner_approval"),
        sa.CheckConstraint("scope IN ('session','plan','equipment')", name="substitution_scope"),
        sa.CheckConstraint(
            "status IN ('pending','approved','rejected','undone')", name="substitution_status"
        ),
    )
    op.create_index(
        "ix_substitution_owner_session",
        "training_substitution_proposals",
        ["owner_id", "session_id"],
    )
    op.create_table(
        "training_substitution_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", sa.String(120), nullable=False),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("training_workout_sessions.id"),
            nullable=False,
        ),
        sa.Column(
            "proposal_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("training_substitution_proposals.id"),
            nullable=False,
        ),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("details", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_substitution_event_owner_session",
        "training_substitution_events",
        ["owner_id", "session_id"],
    )


def downgrade() -> None:
    op.drop_table("training_substitution_events")
    op.drop_table("training_substitution_proposals")
    op.drop_column("training_workout_sessions", "prescription_snapshot")
    op.drop_column("training_workout_sessions", "version")
