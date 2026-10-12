"""Revocable post moderation and private decision audit."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "20261011_0018"
down_revision = "20261011_0017"
branch_labels = depends_on = None


def upgrade():
    op.add_column(
        "community_posts",
        sa.Column("moderation_hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "community_moderation_audit",
        sa.Column("id", UUID(), primary_key=True),
        sa.Column("report_id", UUID(), nullable=False),
        sa.Column("post_id", UUID(), nullable=False),
        sa.Column("post_owner_id", sa.String(128), nullable=False),
        sa.Column("moderator_id", sa.String(128), nullable=False),
        sa.Column("decision", sa.String(24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    for column in ("report_id", "post_owner_id", "moderator_id"):
        op.create_index(f"ix_moderation_{column}", "community_moderation_audit", [column])


def downgrade():
    op.drop_table("community_moderation_audit")
    op.drop_column("community_posts", "moderation_hidden")
