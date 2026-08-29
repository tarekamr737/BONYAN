from __future__ import annotations

import sqlalchemy as sa
from alembic.operations import Operations


def upgrade(op: Operations) -> None:
    op.create_table(
        "community_posts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(length=128), nullable=False),
        sa.Column("author_display_name", sa.String(length=120), nullable=False),
        sa.Column("post_type", sa.String(length=24), nullable=False),
        sa.Column("caption", sa.Text(), nullable=False),
        sa.Column("avatar_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_community_posts"),
    )
    op.create_index("ix_community_posts_owner_id", "community_posts", ["owner_id"])
    op.create_index("ix_community_posts_created_at", "community_posts", ["created_at"])

    op.create_table(
        "community_post_reactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("post_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.String(length=128), nullable=False),
        sa.Column("reaction", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["post_id"], ["community_posts.id"], name="fk_reaction_post", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_community_post_reactions"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_post_reaction_post_user"),
    )
    op.create_index(
        "ix_community_post_reactions_post_id", "community_post_reactions", ["post_id"]
    )
    op.create_index(
        "ix_community_post_reactions_user_id", "community_post_reactions", ["user_id"]
    )

    op.create_table(
        "community_post_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("post_id", sa.Uuid(), nullable=False),
        sa.Column("reporter_id", sa.String(length=128), nullable=False),
        sa.Column("reason", sa.String(length=24), nullable=False),
        sa.Column("note", sa.String(length=300), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["post_id"], ["community_posts.id"], name="fk_report_post", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_community_post_reports"),
        sa.UniqueConstraint("post_id", "reporter_id", name="uq_post_report_post_reporter"),
    )
    op.create_index(
        "ix_community_post_reports_post_id", "community_post_reports", ["post_id"]
    )
    op.create_index(
        "ix_community_post_reports_reporter_id", "community_post_reports", ["reporter_id"]
    )


def downgrade(op: Operations) -> None:
    op.drop_index("ix_community_post_reports_reporter_id", table_name="community_post_reports")
    op.drop_index("ix_community_post_reports_post_id", table_name="community_post_reports")
    op.drop_table("community_post_reports")
    op.drop_index("ix_community_post_reactions_user_id", table_name="community_post_reactions")
    op.drop_index("ix_community_post_reactions_post_id", table_name="community_post_reactions")
    op.drop_table("community_post_reactions")
    op.drop_index("ix_community_posts_created_at", table_name="community_posts")
    op.drop_index("ix_community_posts_owner_id", table_name="community_posts")
    op.drop_table("community_posts")
