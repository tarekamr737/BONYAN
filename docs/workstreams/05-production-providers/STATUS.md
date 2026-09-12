# Workstream 05 Status

## Final provider lock — 2026-09-12

- Exercises: ExerciseDB V1 Free API; active adapter and live search/detail/media pass.
- Coach: SovereignEG `glm-5.3-flash`; authenticated model discovery and adapter regression pass.
  The first live Coach run passed 5/7 in 65.82 seconds; mixed-language and unknown-state tool
  selection failed. Repeated scoring and human Arabic review remain pending. Standard routing is
  not an Egypt data-residency guarantee.
- Avatar: OpenRouter `meta/muse-image`; dedicated adapter/security tests pass. Against the maximum
  available consented set (two photos of one identity, three generations each), it scored 4.30/5
  weighted with 4.33 average identity and 4.0 lowest identity, passing the defined gate. Qwen Image
  3 scored 3.78/5 and failed on identity drift. Cloudflare FLUX remains historical at 2.75/5.
- OCR: Mistral `mistral-ocr-4-1`; the private nine-case suite passes. Six cases have ground-truth
  accuracy assertions; three hardest multipart images pass extraction but still need labels.

Provider abstractions, backend-only secrets, private Avatar lifecycle, safe errors, and no-automatic-
paid-fallback policy are preserved. Normal backend/mobile/export/migration gates pass. Release remains
blocked by the replacement Coach score, limited one-identity Avatar coverage, labels for the three
hardest OCR images, provider-outage checks, and native-device QA. The disposable-user full staging
flow passes through the temporary HTTPS QA tunnel, including cleanup and account deletion. EAS
Android build `30d5a4b3-0131-4ac2-b8d7-96ba15d2e0bc` completed; installation QA is pending, while
iOS remains blocked on an Apple Developer team, registered device, and distribution credentials.
