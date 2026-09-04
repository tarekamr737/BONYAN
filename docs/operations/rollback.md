# Deployment and Migration Rollback

## Deployment Rollback

1. Stop rollout and preserve safe logs/evidence.
2. Select the previous known-good immutable image or release SHA.
3. Confirm its configuration contract is compatible with the current database revision.
4. Redeploy through the same gated workflow; do not rebuild source under the old tag.
5. Run `/health`, `/ready`, auth, upload, and affected provider smoke checks.

## Migration Decision

Prefer a forward corrective migration. Use `alembic downgrade` only when the migration's downgrade
has been reviewed against production-like data, the application rollback requires it, and a fresh
verified backup exists. Before any schema change, record `alembic current`, `alembic heads`, the
target revision, expected lock/runtime impact, and the recovery owner.

If a destructive or irreversible migration is introduced, its downgrade must fail clearly and the
release plan must use restore/forward repair instead. Never run an unreviewed downgrade during an incident.
