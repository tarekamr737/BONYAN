"""Private avatar provenance and explicit granular sharing permissions."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "20261011_0015"
down_revision = "20261011_0014"
branch_labels = depends_on = None


def upgrade():
    op.add_column(
        "community_posts",
        sa.Column("sharing_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("avatars", sa.Column("measurement_snapshot", JSONB(), nullable=True))
    op.add_column(
        "avatar_source_photos",
        sa.Column("processing_consent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "privacy_preferences",
        sa.Column("owner_id", sa.String(128), primary_key=True),
        sa.Column("permissions", JSONB(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_table(
        "privacy_audit",
        sa.Column("id", UUID(), primary_key=True),
        sa.Column("owner_id", sa.String(128), nullable=False),
        sa.Column("changes", JSONB(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_privacy_audit_owner_id", "privacy_audit", ["owner_id"])
    op.create_table(
        "community_user_blocks",
        sa.Column("owner_id", sa.String(128), primary_key=True),
        sa.Column("blocked_id", sa.String(128), primary_key=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.execute("UPDATE avatars SET is_public = false")


def downgrade():
    op.drop_column("community_posts", "sharing_confirmed")
    op.drop_table("community_user_blocks")
    op.drop_table("privacy_audit")
    op.drop_table("privacy_preferences")
    op.drop_column("avatar_source_photos", "processing_consent_at")
    op.drop_column("avatars", "measurement_snapshot")
