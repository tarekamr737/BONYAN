"""Add coaching preferences and append-only profile/assessment history."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260914_0008"
down_revision = "20260904_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_profiles",
        sa.Column(
            "coaching", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False
        ),
    )
    op.drop_constraint(op.f("ck_user_profiles_training_goal_value"), "user_profiles", type_="check")
    op.create_check_constraint(
        "training_goal_value",
        "user_profiles",
        "training_goal IS NULL OR training_goal IN "
        "('strength','hypertrophy','fat_loss','general_fitness','military_preparation')",
    )
    op.create_table(
        "profile_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(120), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id", "request_id", name="uq_profile_history_request"),
    )
    op.create_index("ix_profile_history_owner_id", "profile_history", ["owner_id"])


def downgrade() -> None:
    # Refuse a lossy downgrade while military profiles exist.
    bind = op.get_bind()
    if bind.scalar(
        sa.text("SELECT count(*) FROM user_profiles WHERE training_goal='military_preparation'")
    ):
        raise RuntimeError("Migrate military goals explicitly before downgrading.")
    op.drop_table("profile_history")
    op.drop_column("user_profiles", "coaching")
    op.drop_constraint(op.f("ck_user_profiles_training_goal_value"), "user_profiles", type_="check")
    op.create_check_constraint(
        "training_goal_value",
        "user_profiles",
        "training_goal IS NULL OR training_goal IN "
        "('strength','hypertrophy','fat_loss','general_fitness')",
    )
