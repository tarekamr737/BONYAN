"""Add email verification challenges.

Revision ID: 20260920_0012
Revises: 20260915_0011
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260920_0012"
down_revision: str | None = "20260915_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "email_verification_challenges",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("code_digest", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_email_verification_challenges")),
    )
    op.create_index(op.f("ix_email_verification_challenges_email"), "email_verification_challenges", ["email"])
    op.create_index(op.f("ix_email_verification_challenges_expires_at"), "email_verification_challenges", ["expires_at"])


def downgrade() -> None:
    op.drop_index(op.f("ix_email_verification_challenges_expires_at"), table_name="email_verification_challenges")
    op.drop_index(op.f("ix_email_verification_challenges_email"), table_name="email_verification_challenges")
    op.drop_table("email_verification_challenges")
