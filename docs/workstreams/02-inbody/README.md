# Workstream 02 - InBody OCR & Progress

## Implemented
- Provider-neutral InBody schemas with explicit scan states, measurement metadata, confidence, source placeholders, review flags, and user-edited tracking.
- InBody service/repository/router with upload validation, duplicate detection, mocked-testable OCR provider boundary, review update, confirmation, latest confirmed scan, history, and deletion.
- Mistral OCR adapter locked to `mistral-ocr-4-1`; credentials remain backend-only through `MISTRAL_API_KEY`.
- Deterministic validation for supported file signatures, known units, low confidence, missing values, negative values, and plausibility ranges.
- PostgreSQL migration for `inbody_scans`, including owner/hash dedupe and owner/status history index.
- Mobile InBody upload, review/correction, confirmation, and progress dashboard screens under feature-owned paths.

## Central Integration Needed
- Include `app.domains.inbody.router` in `apps/api/app/core/routing.py` when WS1 performs central API registration.
- Add authenticated navigation entries to `apps/mobile/app/inbody/*` or compose the exported screens from `apps/mobile/src/features/inbody`.
- Replace the temporary `X-Bonyan-User-Id` header dependency in `domains/inbody/router.py` with the shared authenticated current-user dependency once WS1 auth lands.
- Wire shared private object storage into `InBodyService.upload_scan`; this branch stores an opaque private key shape but does not invent a second storage subsystem before WS1 storage primitives exist.

## Verification
- `python -m pytest -q -c apps/api/pyproject.toml` passes.
- `python -m pytest -q -c apps/api/pyproject.toml tests/inbody` passes.
- `python -m compileall -q apps/api/app` passes.
- `python -m ruff check --config apps/api/pyproject.toml apps/api/app tests/api tests/inbody` passes.
- `npm run mobile:typecheck` passes.
- `npm run mobile:lint` passes.
- `npm run mobile:test` passes.
- `impeccable detect apps/mobile/src/features/inbody apps/mobile/app/inbody` passes.

## Known Blockers
- Live Mistral calls require `MISTRAL_API_KEY`; tests use mocks and structured mapping fixtures.
- Private object deletion retention should be wired to the shared WS1 storage primitive when that lands.
