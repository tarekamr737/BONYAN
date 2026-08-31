# BONYAN Workstream 06 — Release Engineering & Hardening Tasks

## A. Baseline

- [x] Sync from latest merged `main` (`2d1736b8cba7ce31e7e3f7ea8fc136e556e23d5f`).
- [x] Verify current CI and final integration tests. Mobile checks and 124 API/release tests pass; a live PostgreSQL migration still requires Docker or staging.
- [x] Create release/operations docs structure.

## B. Staging

- [x] Define staging environment variables.
- [x] Configure staging HTTPS API, PostgreSQL, persistent private storage, and migrations.
- [ ] Verify health/readiness. Liveness exists; DB readiness is implemented but API execution requires Python/PostgreSQL.
- [x] Document staging deploy/startup.

## C. Production Preparation

- [x] Define the production environment template and DB/storage references.
- [x] Document migrations, deployment rollback, and migration rollback.
- [x] Prevent feature-branch production deploys and require a release/manual gate.
- [x] Add a post-deploy health/smoke check.

## D–F. Security

- [x] Audit tracked files for secrets; document separation, rotation, least privilege, and signing.
- [x] Add/test registration, login, OCR, Coach, Avatar, and media-token rate limits.
- [x] Verify upload type/size/name/privacy/cleanup/deletion and add release security tests.

## G–I. Operations and Privacy

- [x] Audit sensitive logging and add safe request/provider/latency/5xx visibility.
- [x] Document alerting and triage.
- [x] Define backup schedule/retention and restore procedure. Live restore remains a staging gate because PostgreSQL/Docker is unavailable locally.
- [x] Verify logout and account/InBody/source-photo/avatar/post deletion lifecycle.

## J. CI/CD

- [x] Validate lint, typecheck, tests, migrations, container build, and all-platform mobile export on pull requests.
- [ ] Configure staging deployment and production release approval. Gated image publication is configured; host rollout awaits the hosting decision.
- [x] Add deployment smoke checks.

## K–L. Native Release QA

- [ ] Validate Android identifiers, versioning, permissions, API URL, release build, and device flows. Configuration and JS export pass; signed build/device unavailable.
- [ ] Validate iOS identifiers, versioning, permissions, API URL, release build, and device flows, or record the exact blocker. Configuration and JS export pass; Windows has no iOS simulator.

## M–O. Performance and Release

- [ ] Measure release-level API, upload, feed, workout, video, Coach, and Avatar behavior.
- [ ] Create and execute the release checklist.
- [ ] Complete final lint/tests/export/migration/security verification and integration handoff.
