# PostgreSQL and Private-Object Backup/Restore

## Policy

- Production: daily encrypted PostgreSQL backup, 30 daily restore points, plus 12 monthly restore points.
- Staging: daily backup with 7-day retention; never restore production data into staging.
- Store backups separately with encryption and delete permissions restricted to backup administrators.
- Enable versioning or snapshots for the approved private-object volume/bucket with matching lifecycle policy.
- Alert on backup failure and on absence of a successful backup within 26 hours.

## Database Backup

Run from a trusted operator environment with `DATABASE_URL` injected by the secret manager:

```sh
pg_dump --format=custom --no-owner --no-acl --file=bonyan-YYYYMMDDTHHMMSSZ.dump "$DATABASE_URL"
pg_restore --list bonyan-YYYYMMDDTHHMMSSZ.dump > bonyan-YYYYMMDDTHHMMSSZ.manifest
```

Encrypt and upload the dump and manifest immediately; remove local plaintext through the approved
secure cleanup process. Never print `DATABASE_URL`.

## Restore Test

1. Provision an isolated empty PostgreSQL database with no application traffic.
2. Download and decrypt one selected restore point.
3. Run `pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl --dbname "$RESTORE_DATABASE_URL" backup.dump`.
4. Run `alembic -c apps/api/alembic.ini current` and compare with the release migration head.
5. Start the matching API release against the restored database and verify `/ready`, authentication, and representative owned-data reads.
6. Record timestamp, duration, release SHA, revision, and result; destroy the isolated restore environment.

This workstation has no Docker/PostgreSQL server, so a real restore is not claimed here. Staging
restore evidence is a release gate.

## Private Objects

Database rows and private objects are not transactionally snapshotted together. During recovery,
restore both to a compatible point, keep access private, and identify missing/orphaned keys before
opening traffic. A database restore must not republish objects deleted after the restore point;
privacy review and deletion reconciliation are required.
