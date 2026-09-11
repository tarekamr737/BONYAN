# Workstream 05 Status

## Final provider lock — 2026-09-11

- Exercises: ExerciseDB V1 Free API; active adapter and live search/detail/media pass.
- Coach: OpenRouter `nvidia/nemotron-3-ultra-550b-a55b:free`; offline tool-contract tests pass.
  NVIDIA free-endpoint privacy terms require resolution, and the key previously returned HTTP 401.
- Avatar: Cloudflare Workers AI `@cf/black-forest-labs/flux-2-klein-4b`; offline adapter/security
  tests pass, live credentials and consented fixture are missing.
- OCR: Mistral `mistral-ocr-4-1`; connectivity passes, representative private-fixture suite pending.

Provider abstractions, backend-only secrets, private Avatar lifecycle, safe errors, and no-automatic-
paid-fallback policy are preserved. Normal backend/mobile/export/migration gates pass. Release remains
blocked by the live Coach and Avatar gates, full staging E2E, private-fixture scoring, and native QA.
