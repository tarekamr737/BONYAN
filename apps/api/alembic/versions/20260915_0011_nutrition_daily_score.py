"""Add authenticated food history used by the daily score."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260915_0011"
down_revision = "20260915_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "nutrition_food_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("meal_type", sa.String(32), nullable=False),
        sa.Column("calories", sa.Integer(), nullable=False),
        sa.Column("protein_g", sa.Numeric(7, 2), nullable=False),
        sa.Column("carbs_g", sa.Numeric(7, 2), nullable=False),
        sa.Column("fat_g", sa.Numeric(7, 2), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("source", sa.String(24), nullable=False),
        sa.Column(
            "logged_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_nutrition_food_logs_owner_id", "nutrition_food_logs", ["owner_id"])
    op.create_index(
        "ix_nutrition_food_owner_logged", "nutrition_food_logs", ["owner_id", "logged_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_nutrition_food_owner_logged", table_name="nutrition_food_logs")
    op.drop_index("ix_nutrition_food_logs_owner_id", table_name="nutrition_food_logs")
    op.drop_table("nutrition_food_logs")
