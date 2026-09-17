"""Add one private profile photo per user."""

import sqlalchemy as sa
from alembic import op

revision = "20260915_0010"
down_revision = "20260914_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("profile_photo_object_key", sa.String(512)))
    op.add_column("user_profiles", sa.Column("profile_photo_media_type", sa.String(64)))
    op.add_column(
        "user_profiles", sa.Column("profile_photo_updated_at", sa.DateTime(timezone=True))
    )


def downgrade() -> None:
    op.drop_column("user_profiles", "profile_photo_updated_at")
    op.drop_column("user_profiles", "profile_photo_media_type")
    op.drop_column("user_profiles", "profile_photo_object_key")
