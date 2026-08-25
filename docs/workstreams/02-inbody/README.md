# Workstream 02 - InBody OCR & Progress

## Implemented
- Provider-neutral InBody schemas with explicit scan states, measurement metadata, confidence, source placeholders, review flags, and user-edited tracking.
- InBody service/repository/router with upload validation, duplicate detection, mocked-testable OCR provider boundary, review update, confirmation, latest confirmed scan, history, and deletion.
- Mistral OCR adapter locked to `mistral-ocr-4-1`; credentials remain backend-only through `MISTRAL_API_KEY`.
- Deterministic validation for supported file signatures, known units, low confidence, missing values, negative values, and plausibility ranges.
- PostgreSQL migration for `inbody_scans`, including owner/hash dedupe and owner/status history index.
- Mobile InBody upload, review/correction, confirmation, and progress dashboard screens under feature-owned paths.

## Central Integration
- `app.domains.inbody.router` is registered under the shared `/api/v1` router.
- Mobile routes are composed under an authenticated InBody layout with native file selection and progress/review navigation.
- Ownership is derived from the shared verified Bearer-token current-user dependency; clients cannot supply the authoritative owner ID.
- Raw reports use the shared private-storage interface and the private development adapter implements upload, metadata, and delete operations.

## Verification
- `python -m pytest -q -c apps/api/pyproject.toml` passes.
- `python -m pytest -q -c apps/api/pyproject.toml tests/inbody` passes.
- `python -m compileall -q apps/api/app` passes.
- `python -m ruff check --config apps/api/pyproject.toml apps/api/app tests/api tests/inbody` passes.
- `npm run mobile:typecheck` passes.
- `npm run mobile:lint` passes.
- `npm run mobile:test` passes.
- `impeccable detect apps/mobile/src/features/inbody apps/mobile/app/inbody` passes.

## Live-provider requirement
- Live Mistral calls require `MISTRAL_API_KEY`; tests use mocks and structured mapping fixtures.
