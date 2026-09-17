# BONYAN Release Candidate Status

Date: 2026-09-13
Branch: `feat/release-candidate`
Starting main SHA: `2b379fa568479505583b25eba4e3e94e1af8cce9`

## Verdict

**CHANGES REQUIRED.** The selected provider stack is implemented and offline gates pass, but the
live Coach benchmark remains below threshold, while native QA and remaining
release controls are not complete.

## Verified

- ExerciseDB is the active provider behind a provider-neutral Training boundary. Live filtered
  search, actual detail lookup, and sanitized official GIF URL retrieval pass.
- SovereignEG is configured for `glm-5.3-flash`. The key, model catalog, and adapter regression pass.
  The first seven-case live Coach run passed 5/7 in 65.82 seconds, failing mixed-language and
  unknown-state tool selection. Repeated scoring and human Arabic review remain pending; standard
  routing is not Egypt data residency.
- OpenRouter Muse and Qwen source-image payload, prompt safety, endpoint/auth, output decoding,
  retry/error mapping, response bounds, and secret redaction pass offline. All 12 private comparison
  calls succeeded. Muse scored 4.30/5 weighted with 4.33 average identity and 4.0 lowest identity,
  passing the defined gate; Qwen scored 3.78/5 and failed identity/prompt drift. Muse is selected.
  Coverage is limited to two photos of one consented identity; Cloudflare FLUX remains historically
  rejected at 2.75/5.
- Mistral `mistral-ocr-4-1` passes the private nine-case fixture suite in 4.59 seconds. Six cases
  assert supplied ground truth; three hardest multipart images currently cover extraction only.
- 240 backend tests pass; 13 opt-in live tests skip normally. Mobile lint, route generation,
  typecheck, 35 tests, and Android/iOS/web Expo release export pass.
- PostgreSQL 17 upgrades to the single head `20260904_0007`; `alembic check` reports no drift.
- Local API boot and `/health` pass; an unauthenticated private Training route returns 401.
- The disposable-user full staging flow passes through the temporary HTTPS QA tunnel in 22.42
  seconds, including OCR, Training, Coach, Avatar approval/publication, cleanup, and account deletion.
- EAS Android internal build `b821a464-f9dc-4dbf-91bd-2afe4aa2ab25` completed with the Preview
  HTTPS API URL and the latest device-QA fixes. Its retained APK SHA-256 is
  `61FAF3C3968056139B4B82FEE6282F242EF76E42AE69D6F38AF0F6E02BF5ABCC`; team installation and
  workflow QA remain pending. EAS confirms iOS signing is blocked because `bonyan_ai` has no Apple
  Developer team or registered device.
- Existing source-photo privacy, explicit approval/publication separation, rate limits, and account
  deletion tests remain green.

## Blocking release gates

- Pass all seven SovereignEG GLM Coach cases repeatedly, complete human Arabic review, and approve
  the provider's routing/privacy posture for private Coach context.
- Add broader consented multi-identity Avatar coverage and approve OpenRouter's routed-provider
  privacy posture. Muse passes the current defined identity gate, but the fixture diversity is low.
- Label the three hardest Mistral images and complete provider-outage staging checks.
- Install and QA the signed Android artifact; connect an Apple Developer team, register the iPhone,
  build/sign iOS, and complete required production environment/reviewer controls.
