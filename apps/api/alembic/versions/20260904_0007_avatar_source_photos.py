"""Add private source photos for production avatar generation.

Revision ID: 20260904_0007
Revises: 20260830_0006
Create Date: 2026-09-04 12:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260904_0007"
down_revision: str | None = "20260830_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "avatar_source_photos",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(length=128), nullable=False),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("media_type", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_avatar_source_photos"),
        sa.UniqueConstraint("object_key", name="uq_avatar_source_photos_object_key"),
    )
    op.create_index(
        "ix_avatar_source_photos_owner_id", "avatar_source_photos", ["owner_id"]
    )
    op.create_index(
        "ix_avatar_source_photos_created_at", "avatar_source_photos", ["created_at"]
    )
    op.add_column("avatars", sa.Column("source_photo_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_avatars_source_photo_id_avatar_source_photos",
        "avatars",
        "avatar_source_photos",
        ["source_photo_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_avatars_source_photo_id_avatar_source_photos", "avatars", type_="foreignkey"
    )
    op.drop_column("avatars", "source_photo_id")
    op.drop_index("ix_avatar_source_photos_created_at", table_name="avatar_source_photos")
    op.drop_index("ix_avatar_source_photos_owner_id", table_name="avatar_source_photos")
    op.drop_table("avatar_source_photos")
