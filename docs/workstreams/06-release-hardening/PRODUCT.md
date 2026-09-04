# BONYAN Workstream 06 — Release Engineering & Hardening

## Outcome

BONYAN has reproducible staging and release configuration, safe secrets, abuse protection,
private upload handling, useful non-sensitive observability, tested recovery procedures where
the environment permits, release-gated CI/CD, truthful native QA status, and an executable
release checklist.

## Required Environments

- `local`: developer-only services and credentials.
- `staging`: HTTPS, PostgreSQL, private object storage, isolated secrets, migrations, and health checks.
- `production`: separately isolated credentials and data with manual release approval and rollback.

## Acceptance Criteria

- No real secrets or signing credentials are tracked.
- Registration, login, OCR, Coach, Avatar, and media-token abuse controls return consistent 429s.
- Upload type, size, naming, privacy, cleanup, access, and deletion behavior is verified.
- Logs expose safe request/provider failure metadata without private payloads.
- Database backup/restore and deployment/migration rollback procedures are executable.
- Account and owned private-data deletion are verified.
- Pull requests validate lint, typecheck, tests, migrations, and mobile export/build.
- Android and iOS status is based on recorded native evidence or an explicit blocker.
- The final checklist contains no hidden P0/P1 release blocker.

## Non-Goals

New product features, provider/model selection, multi-region infrastructure, Kubernetes,
microservices, queues, caches, or speculative scaling work.

