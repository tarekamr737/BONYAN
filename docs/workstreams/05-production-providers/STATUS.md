# Workstream 05 Status

## Final provider lock — 2026-09-11

- Exercises: ExerciseDB V1 Free API; active adapter and live search/detail/media pass.
- Coach: SovereignEG `glm-5.3-flash`; authenticated model discovery and adapter regression pass.
  The first live Coach run passed 5/7 in 65.82 seconds; mixed-language and unknown-state tool
  selection failed. Repeated scoring and human Arabic review remain pending. Standard routing is
  not an Egypt data-residency guarantee.
- Avatar: Cloudflare Workers AI `@cf/black-forest-labs/flux-2-klein-4b`; offline adapter/security
  tests pass. Six private live generations from two consented sources all passed the image contract,
  but human quality scored only 2.75/5 weighted. Identity preservation and regeneration consistency
  are 2/5, so this candidate is not release-eligible despite valid output and low estimated cost.
- OCR: Mistral `mistral-ocr-4-1`; the private nine-case suite passes. Six cases have ground-truth
  accuracy assertions; three hardest multipart images pass extraction but still need labels.

Provider abstractions, backend-only secrets, private Avatar lifecycle, safe errors, and no-automatic-
paid-fallback policy are preserved. Normal backend/mobile/export/migration gates pass. Release remains
blocked by the replacement Coach score, failed Avatar identity/quality gate, full staging E2E, labels for
the three hardest OCR images, and native QA.
