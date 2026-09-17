# Workstream 05 Task Status

Status as of 2026-09-17. The final Coach, Avatar, OCR, and ExerciseDB providers have
live evidence from private, explicitly consented fixtures where applicable.

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
- [x] Document candidate shortlist, configuration, costs,
  validation commands, blockers, and the Person 01 handoff.
- [x] Pass backend lint, 141 offline backend tests, mobile lint/typecheck/routes/tests,
  Expo web export, migration rendering, and API boot/health validation.

## Pending Live Evidence

- [x] Run and human-score the approved final SovereignEG Coach provider, including
  Egyptian Arabic quality (7/7 live cases passed).
- [x] Run and score both final OpenRouter Avatar candidates using the maximum consented private set.
- [x] Validate the nine-sample consented InBody manifest against Mistral ground truth.
- [x] Replace blocked MuscleWiki MVP access with ExerciseDB V1 and validate live search, filters,
  detail, and GIF media behavior.
- [ ] Run the complete deployed staging flow and outage-integrity checks.
- [ ] Replace candidate estimates and placeholder configuration with measured final findings.

## Remaining External Inputs

- `BONYAN_STAGING_BASE_URL`, `BONYAN_STAGING_TOKEN`, and `BONYAN_RUN_FULL_STAGING=1`
