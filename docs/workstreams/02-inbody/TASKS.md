# Workstream 02 - InBody OCR & Progress Tasks

## A. Contracts
- [x] Define provider-neutral scan schema.
- [x] Define measurement metadata schema.
- [x] Define processing states.
- [x] Define latest/history contract for Training.
- [x] Add schema tests.

## B. Persistence
- [x] Create scan DB model.
- [x] Create measurement persistence strategy.
- [x] Add migration.
- [x] Create user-scoped repository.
- [x] Add authorization tests.

## C. Upload
- [x] Add private upload endpoint.
- [x] Validate image/PDF types and size.
- [x] Reject empty/corrupt files.
- [x] Persist upload hash/fingerprint.
- [x] Add duplicate handling.

## D. Mistral
- [x] Add backend-only config/client.
- [x] Implement `mistral-ocr-4-1` adapter.
- [x] Add timeout and bounded transient retry contract.
- [x] Add provider error mapping.
- [x] Add mock provider tests.

## E. Extraction
- [x] Define structured extraction schema.
- [x] Map output to provider-neutral DTO.
- [x] Preserve null for missing fields.
- [x] Preserve confidence/source when available.
- [x] Normalize known units deterministically.

## F. Validation
- [x] Add plausibility validation.
- [x] Flag suspicious values/unknown units.
- [x] Verify validation never invents measurements.
- [x] Add edge-case tests.

## G. Review / Confirmation API
- [x] Add scan detail.
- [x] Add review/update endpoint.
- [x] Track user-edited fields.
- [x] Add confirm endpoint.
- [x] Prevent unconfirmed data from being canonical.
- [x] Add latest/history services.

## H. Mobile Upload
- [x] Build upload/file picker shell for WS1-native picker wiring.
- [x] Add upload + processing states.
- [x] Add provider failure/retry UX.

## I. Review
- [x] Build structured review screen.
- [x] Mark missing/uncertain fields.
- [x] Allow corrections.
- [x] Add explicit confirm action.

## J. Progress
- [x] Build scan history/detail foundation.
- [x] Add weight trend.
- [x] Add skeletal muscle trend.
- [x] Add body-fat percentage trend.
- [x] Add body-fat mass trend.
- [x] Skip unavailable metrics cleanly.

## K. Delete / Privacy
- [x] Add scan delete flow.
- [ ] Delete source per retention policy after WS1 private storage is registered.
- [x] Verify cross-user access fails.
- [x] Verify logs exclude sensitive data by avoiding document/measurement logging in this domain.

## L. Final
- [x] Test image/native PDF/scanned PDF.
- [x] Test missing/low-confidence fields.
- [x] Test corrupt/unsupported file.
- [x] Test timeout/duplicate/unauthorized access.
- [ ] API lint blocked by unavailable pinned ruff package in configured index.
- [x] Typecheck passes.
- [x] Tests pass.
