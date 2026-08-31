# BONYAN Workstream 06 — Release Engineering & Hardening Tasks

## A. Baseline

- [x] Sync from latest merged `main` (`2d1736b8cba7ce31e7e3f7ea8fc136e556e23d5f`).
- [ ] Verify current CI and final integration tests. Mobile checks pass; API/migration checks require Python and PostgreSQL.
- [x] Create release/operations docs structure.

## B. Staging

- [ ] Define staging environment variables.
- [ ] Configure staging HTTPS API, PostgreSQL, private object storage, and migrations.
- [ ] Verify health/readiness.
- [ ] Document staging deploy/startup.

## C. Production Preparation

- [ ] Define the production environment template and DB/storage references.
- [ ] Document migrations, deployment rollback, and migration rollback.
- [ ] Prevent feature-branch production deploys and require a release/manual gate.
- [ ] Add a post-deploy health/smoke check.

## D–F. Security

- [ ] Audit tracked files for secrets; document separation, rotation, least privilege, and signing.
- [ ] Add/test registration, login, OCR, Coach, Avatar, and media-token rate limits.
- [ ] Verify upload type/size/name/privacy/cleanup/deletion and add release security tests.

## G–I. Operations and Privacy

- [ ] Audit sensitive logging and add safe request/provider/latency/5xx visibility.
- [ ] Document alerting and triage.
- [ ] Define backup schedule/retention and test restore where feasible.
- [ ] Verify logout and account/InBody/source-photo/avatar/post deletion lifecycle.

## J. CI/CD

- [ ] Validate lint, typecheck, tests, migrations, and mobile build/export on pull requests.
- [ ] Configure staging deployment and production release approval.
- [ ] Add deployment smoke checks.

## K–L. Native Release QA

- [ ] Validate Android identifiers, versioning, permissions, API URL, release build, and device flows.
- [ ] Validate iOS identifiers, versioning, permissions, API URL, release build, and device flows, or record the exact blocker.

## M–O. Performance and Release

- [ ] Measure release-level API, upload, feed, workout, video, Coach, and Avatar behavior.
- [ ] Create and execute the release checklist.
- [ ] Complete final lint/tests/export/migration/security verification and integration handoff.

