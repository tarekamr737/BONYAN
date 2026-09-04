# Workstream 05 Task Status

Status as of 2026-09-04. Live evidence gates remain unchecked until credentials and
private, consented fixtures are supplied.

## Complete

- [x] Sync from latest merged `main` and verify the existing provider mocks.
- [x] Add reproducible Coach and Avatar candidate sets, fixtures, scoring rubrics,
  latency capture, and cost capture.
- [x] Implement configurable production Coach and Avatar adapters while preserving mocks.
- [x] Enforce typed Coach tools, bounded retries, safe provider errors, and usage metadata.
- [x] Implement private Avatar source upload, generation, review, approval, and explicit
  publication boundaries.
- [x] Align the Mistral OCR 4.1 and MuscleWiki clients with current provider contracts.
- [x] Add opt-in live suites for Coach, Avatar, Mistral, MuscleWiki, and full staging.
- [x] Document provisional decisions, rejected candidates, configuration, costs,
  validation commands, blockers, and the Person 01 handoff.
- [x] Pass backend lint, 140 offline backend tests, mobile lint/typecheck/routes/tests,
  Expo web export, migration rendering, and API boot/health validation.

## Pending Live Evidence

- [ ] Run and human-score all Coach candidates, including Egyptian Arabic quality.
- [ ] Run and human-score all Avatar candidates using consented private fixtures.
- [ ] Validate six real InBody formats against Mistral ground truth.
- [ ] Validate live MuscleWiki search, filters, pagination, detail, and media behavior.
- [ ] Run the complete deployed staging flow and outage-integrity checks.
- [ ] Replace provisional selections and estimated latency with measured final findings.

## External Inputs Required

- `CHAT_API_KEY` or `OPENAI_API_KEY`
- `AVATAR_API_KEY` and `BONYAN_LIVE_AVATAR_MANIFEST`
- `MISTRAL_API_KEY` and `BONYAN_LIVE_OCR_MANIFEST`
- `MUSCLEWIKI_API_KEY`
- `BONYAN_STAGING_BASE_URL`, `BONYAN_STAGING_TOKEN`, and `BONYAN_RUN_FULL_STAGING=1`
