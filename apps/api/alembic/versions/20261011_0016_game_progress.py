"""Server-authoritative game events, reversible awards and progress snapshots."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "20261011_0016"
down_revision = "20261011_0015"
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        "game_events",
        sa.Column("id", UUID(), primary_key=True),
        sa.Column("owner_id", sa.String(128), nullable=False),
        sa.Column("source_key", sa.String(160), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("local_day", sa.Date(), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("timezone", sa.String(80), nullable=False),
        sa.Column("version", sa.String(32), nullable=False),
        sa.Column("evidence", JSONB(), nullable=False),
        sa.Column("eligible", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("owner_id", "source_key", name="uq_game_owner_source"),
    )
    op.create_index("ix_game_owner_week", "game_events", ["owner_id", "week_start"])
    op.create_table(
        "game_award_ledger",
        sa.Column("id", UUID(), primary_key=True),
        sa.Column("owner_id", sa.String(128), nullable=False),
        sa.Column("event_id", UUID(), sa.ForeignKey("game_events.id"), nullable=False),
        sa.Column("reverses_id", UUID(), sa.ForeignKey("game_award_ledger.id")),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("xp", sa.Integer(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("event_id", name="uq_award_event"),
        sa.UniqueConstraint("reverses_id", name="uq_award_reversal"),
    )
    op.create_index("ix_award_owner_created", "game_award_ledger", ["owner_id", "created_at"])
    op.create_table(
        "game_weekly_targets",
        sa.Column("owner_id", sa.String(128), primary_key=True),
        sa.Column("week_start", sa.Date(), primary_key=True),
        sa.Column("timezone", sa.String(80), nullable=False),
        sa.Column("workout_days", sa.Integer(), nullable=False),
        sa.Column("experience", sa.String(32), nullable=False),
        sa.Column("goal", sa.String(40), nullable=False),
        sa.Column("league_opt_in", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_table(
        "progress_score_snapshots",
        sa.Column("id", UUID(), primary_key=True),
        sa.Column("owner_id", sa.String(128), nullable=False),
        sa.Column("evidence_hash", sa.String(64), nullable=False),
        sa.Column("result", JSONB(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("owner_id", "evidence_hash", name="uq_progress_owner_evidence"),
    )
    op.create_index(
        "ix_progress_owner_created", "progress_score_snapshots", ["owner_id", "created_at"]
    )
    # No historic award backfill. Only new authoritative events mint XP/points.


def downgrade():
    for table in (
        "progress_score_snapshots",
        "game_weekly_targets",
        "game_award_ledger",
        "game_events",
    ):
        op.drop_table(table)
