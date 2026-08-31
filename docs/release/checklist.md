# BONYAN Release Checklist

Run this checklist for every staging candidate and repeat it for the exact production image.
Record the commit SHA, image digest, operator, UTC time, and links to CI/device evidence. A blocked
gate is a failed release; do not replace missing evidence with a verbal approval.

## 1. Candidate and CI

- [ ] Candidate is an immutable commit on `main` (staging) or an approved `v*` tag/manual
  production run.
- [ ] GitHub CI passes mobile lint, route validation, typecheck, tests, all-platform export, API
  lint/tests, PostgreSQL migration validation, and container build.
- [ ] Published API image digest matches the candidate workflow output.
- [ ] `python -m pytest -c apps/api/pyproject.toml tests/release` passes.
- [ ] No unreviewed database migration or release configuration changes remain.

Local preflight from the repository root:

```powershell
npm.cmd run mobile:lint
npm.cmd run mobile:routes
npm.cmd run mobile:typecheck
npm.cmd run mobile:test
npm.cmd run mobile:export:release
python -m ruff check --config apps/api/pyproject.toml apps/api/app tests deployment
python -m pytest -c apps/api/pyproject.toml
python -m alembic -c apps/api/alembic.ini upgrade head --sql
```

## 2. Environment, secrets, and providers

- [ ] `API_ENV`, `API_PUBLIC_URL`, `DATABASE_URL`, `PRIVATE_STORAGE_ROOT`, and mobile
  `EXPO_PUBLIC_API_BASE_URL` identify the same isolated environment.
- [ ] API and mobile URLs use HTTPS; CORS contains only approved origins.
- [ ] JWT, database, OCR, exercise, Coach, Avatar, storage, and signing secrets come from the
  environment secret store and are absent from Git and build logs.
- [ ] Secret owners and last-rotation dates are recorded; production identities have least
  privilege and are distinct from staging.
- [ ] Person 05 has supplied and verified the selected production Coach and Avatar providers.
- [ ] Provider failure and timeout behavior returns safe errors without sensitive logs.

## 3. Database and private storage

- [ ] A successful database backup exists inside the required retention window.
- [ ] `alembic current` reports the expected pre-deploy revision.
- [ ] `alembic upgrade head` succeeds against the target database.
- [ ] `alembic check` reports no ungenerated operations.
- [ ] Private storage is persistent, non-public, writable only by the API identity, and monitored
  for capacity/errors.
- [ ] Upload MIME/signature/size limits, short-lived reads, failed-upload cleanup, and deletion
  pass in the target environment.

## 4. Deploy and smoke

- [ ] Deploy the immutable image using [deployment.md](deployment.md).
- [ ] Run `python deployment/smoke_check.py https://<api-host>` and retain its output.
- [ ] Confirm `/health` and `/ready` over HTTPS and confirm HTTP redirects or is unavailable.
- [ ] Confirm logs and metrics receive safe request IDs, latency, 5xx, database, and provider
  failure signals.
- [ ] Exercise register/login, OCR, Coach, Avatar, and media-token rate limits without exposing
  request content.

## 5. Native release evidence

- [ ] Android signed artifact has the approved application ID/version and installs on a named
  emulator or physical device.
- [ ] Android device evidence covers auth, onboarding, profile, image/PDF import, Training,
  media, set logging, Coach, Avatar, Community, session restore, background/resume, offline/slow
  behavior, provider failure, and permission denial.
- [ ] iOS signed artifact has the approved bundle ID/version and equivalent simulator/device
  evidence.
- [ ] Mobile build contains the target HTTPS API URL and no secrets.

## 6. Recovery, privacy, and approval

- [ ] Restore rehearsal evidence is current for the environment and meets the recovery objective.
- [ ] Deployment and migration rollback commands are prepared for this exact image/revision.
- [ ] Account, InBody document, Avatar object, Community post, and source-photo deletion are
  verified without sensitive logging.
- [ ] Monitoring owner is present for the release window and rollback authority is named.
- [ ] Product/engineering release approvers accept all evidence and the production environment
  gate is approved.

## Workstream 06 execution record (2026-08-31)

Local CI-equivalent tests, security tests, all-platform Expo export, offline migration SQL
generation, configuration review, and rollback/privacy documentation are complete. The remaining
unchecked gates require a selected host/domain, staging and production credentials, a live
PostgreSQL/private-storage environment, Person 05's production providers, signing credentials,
and real Android/iOS device infrastructure.
