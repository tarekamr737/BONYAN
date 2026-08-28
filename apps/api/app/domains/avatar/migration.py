from __future__ import annotations

import sqlalchemy as sa
from alembic.operations import Operations


def upgrade(op: Operations) -> None:
    op.create_table(
        "avatars",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(length=128), nullable=False),
        sa.Column("generated_object_key", sa.String(length=512), nullable=True),
        sa.Column("generated_media_type", sa.String(length=64), nullable=True),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("style", sa.String(length=160), nullable=False),
        sa.Column("presentation", sa.String(length=16), nullable=False),
        sa.Column("shape_profile", sa.String(length=16), nullable=False),
        sa.Column("provider_model", sa.String(length=160), nullable=False),
        sa.Column("measurement_source", sa.String(length=32), nullable=False),
        sa.Column("measurements_recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("failure_code", sa.String(length=80), nullable=True),
        sa.Column("is_public", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_avatars"),
    )
    op.create_index("ix_avatars_owner_id", "avatars", ["owner_id"])
    op.create_index("ix_avatars_state", "avatars", ["state"])
    op.create_index("ix_avatars_created_at", "avatars", ["created_at"])


def downgrade(op: Operations) -> None:
    op.drop_index("ix_avatars_created_at", table_name="avatars")
    op.drop_index("ix_avatars_state", table_name="avatars")
    op.drop_index("ix_avatars_owner_id", table_name="avatars")
    op.drop_table("avatars")
