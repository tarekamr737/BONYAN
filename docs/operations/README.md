# Operations Documentation

This directory owns executable operational procedures for:

- health/readiness monitoring and incident triage;
- PostgreSQL backup, retention, restore, and verification;
- deployment and migration rollback;
- private-object recovery and deletion implications;
- secrets inventory and rotation.

Current runbooks:

- [Secrets inventory and rotation](secrets.md)
- [Monitoring and incident triage](monitoring.md)
- [Privacy and account lifecycle](privacy-lifecycle.md)
- [PostgreSQL and private-object backup/restore](backup-restore.md)
- [Deployment and migration rollback](rollback.md)

Procedures must distinguish staging from production and must not contain real secret values.
