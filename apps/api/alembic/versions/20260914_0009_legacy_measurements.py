"""Preserve existing manual body measurements in the assessment timeline."""

from alembic import op

revision = "20260914_0009"
down_revision = "20260914_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Import facts and their original timestamps. No historical score is invented.
    op.execute("""
        INSERT INTO profile_history (id, owner_id, request_id, kind, snapshot, created_at)
        SELECT md5('legacy-manual:' || owner_id)::uuid, owner_id,
               md5('legacy-manual:' || owner_id)::uuid, 'assessment',
               jsonb_build_object(
                 'source', 'manual', 'imported', true,
                 'measurements', jsonb_build_object(
                   'height_cm', height_cm, 'weight_kg', weight_kg,
                   'body_fat_percentage', body_fat_percentage,
                   'skeletal_muscle_mass_kg', skeletal_muscle_mass_kg
                 )), recorded_at
        FROM avatar_manual_body_metrics AS legacy
        WHERE NOT EXISTS (
          SELECT 1 FROM profile_history AS history
          WHERE history.owner_id = legacy.owner_id AND history.kind = 'assessment'
        )
        ON CONFLICT (owner_id, request_id) DO NOTHING
    """)


def downgrade() -> None:
    # Keep imported historical facts: the preceding schema owns the table lifecycle.
    pass
