"""Opted-in comparable leagues, friend invitations, challenges and gated rewards."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "20261011_0017"
down_revision = "20261011_0016"
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        "game_seasons",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("starts_at", sa.Date(), nullable=False),
        sa.Column("ends_at", sa.Date(), nullable=False),
        sa.Column("rules_version", sa.String(32), nullable=False),
    )
    op.create_table(
        "game_leagues",
        sa.Column("id", UUID(), primary_key=True),
        sa.Column("season_id", sa.String(32), sa.ForeignKey("game_seasons.id"), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("goal", sa.String(40), nullable=False),
        sa.Column("experience", sa.String(32), nullable=False),
        sa.Column("workout_days", sa.Integer(), nullable=False),
        sa.Column("cohort", sa.Integer(), nullable=False),
        sa.UniqueConstraint(
            "week_start", "goal", "experience", "workout_days", "cohort", name="uq_league_cohort"
        ),
    )
    op.add_column(
        "game_weekly_targets",
        sa.Column("league_id", UUID(), sa.ForeignKey("game_leagues.id"), nullable=True),
    )
    op.create_table(
        "game_identities",
        sa.Column("owner_id", sa.String(128), primary_key=True),
        sa.Column("invite_code", UUID(), nullable=False, unique=True),
    )
    op.create_table(
        "game_friendships",
        sa.Column("id", UUID(), primary_key=True),
        sa.Column("member_a", sa.String(128), nullable=False),
        sa.Column("member_b", sa.String(128), nullable=False),
        sa.Column("inviter_id", sa.String(128), nullable=False),
        sa.Column("recipient_id", sa.String(128), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("member_a", "member_b", name="uq_friend_pair"),
    )
    op.create_index("ix_friend_recipient_status", "game_friendships", ["recipient_id", "status"])
    op.create_table(
        "game_challenges",
        sa.Column("id", UUID(), primary_key=True),
        sa.Column("creator_id", sa.String(128), nullable=False),
        sa.Column("recipient_id", sa.String(128), nullable=False),
        sa.Column("category", sa.String(24), nullable=False),
        sa.Column("target_points", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_challenge_recipient_status", "game_challenges", ["recipient_id", "status"])
    op.create_table(
        "game_reward_inventory",
        sa.Column("id", UUID(), primary_key=True),
        sa.Column("partner_id", sa.String(128), nullable=False),
        sa.Column("verified", sa.Boolean(), nullable=False),
        sa.Column("remaining", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("terms", JSONB(), nullable=False),
    )
    op.create_table(
        "game_reward_claims",
        sa.Column("id", UUID(), primary_key=True),
        sa.Column("owner_id", sa.String(128), nullable=False),
        sa.Column(
            "inventory_id", UUID(), sa.ForeignKey("game_reward_inventory.id"), nullable=False
        ),
        sa.Column("provider_claim_id", sa.String(160), nullable=False),
        sa.Column("state", sa.String(32), nullable=False),
        sa.Column("audit", JSONB(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("owner_id", "inventory_id", name="uq_reward_owner_inventory"),
        sa.UniqueConstraint("provider_claim_id", name="uq_reward_provider_claim"),
    )


def downgrade():
    for table in (
        "game_reward_claims",
        "game_reward_inventory",
        "game_challenges",
        "game_friendships",
        "game_identities",
    ):
        op.drop_table(table)
    op.drop_column("game_weekly_targets", "league_id")
    op.drop_table("game_leagues")
    op.drop_table("game_seasons")
