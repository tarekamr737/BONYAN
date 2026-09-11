# BONYAN Release Candidate Status

Date: 2026-09-11
Branch: `feat/release-candidate`
Starting main SHA: `2b379fa568479505583b25eba4e3e94e1af8cce9`

## Verdict

**CHANGES REQUIRED.** The final free provider stack is implemented and offline gates pass, but the
live Coach benchmark is below threshold and private-fixture scoring, staging E2E, and native QA are
not complete.

## Verified

- ExerciseDB is the active provider behind a provider-neutral Training boundary. Live filtered
  search, actual detail lookup, and sanitized official GIF URL retrieval pass.
- SovereignEG is configured for `glm-5.3-flash`. The key, model catalog, and adapter regression pass.
  The first seven-case live Coach run passed 5/7 in 65.82 seconds, failing mixed-language and
  unknown-state tool selection. Repeated scoring and human Arabic review remain pending; standard
  routing is not Egypt data residency.
- Cloudflare FLUX source-image multipart, prompt safety, endpoint/auth, output decoding, retry/error
  mapping, response bounds, and secret redaction pass offline. Credentials plus the repository's
  synthetic fixture passed live model execution in 9.53 seconds; real identity/quality scoring is
  still blocked because the intended private source image is absent.
- Mistral `mistral-ocr-4-1` connectivity passes with a generated blank PDF.
- 217 backend tests pass; 12 opt-in live tests skip normally. Mobile lint, route generation,
  typecheck, 27 tests, and Android/iOS/web Expo release export pass.
- PostgreSQL 17 upgrades to the single head `20260904_0007`; `alembic check` reports no drift.
- Local API boot and `/health` pass; an unauthenticated private Training route returns 401.
- Existing source-photo privacy, explicit approval/publication separation, rate limits, and account
  deletion tests remain green.

## Blocking release gates

- Pass all seven SovereignEG GLM Coach cases repeatedly, complete human Arabic review, and approve
  the provider's routing/privacy posture for private Coach context.
- Provide the intended consented private Avatar fixture and pass identity, realism, regeneration,
  approval/publication, deletion, latency, and quota checks.
- Run representative private Mistral fixtures and the disposable-user full staging flow.
- Complete signed native-device QA and required production environment/reviewer controls.
