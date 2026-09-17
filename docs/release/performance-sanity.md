# Performance Sanity Record

Date: 2026-08-31

This is release-level sanity evidence, not a production capacity claim. Measurements used Python
3.13.15 on Windows with in-process HTTP and deterministic/mock providers because no staging host,
PostgreSQL service, native device, or live provider credentials are available.

## Results

| Path | Local evidence | Result |
| --- | --- | --- |
| API liveness | 300 in-process `/health` requests | p50 2.339 ms; p95 3.128 ms; max 56.852 ms |
| Upload/OCR | Signature, MIME, byte-size, PDF-page, cleanup, and provider-timeout tests | PASS; live upload latency blocked on staging/provider access |
| Community feed | Cursor pagination and batch-read regression tests | PASS; reactions and public Avatar records use bounded batch reads rather than per-post database reads |
| Workout | Deterministic plan/session service tests | PASS; no duplicate query-key defect found in the mobile review |
| Video | Current UI renders a provider-media placeholder | BLOCKED; there is no video playback path whose startup can be measured |
| Coach | Mock behavior and enforced timeout regression test | PASS; provider call ceiling is 30 seconds; live latency was not measured in this historical baseline |
| Avatar | Mock generation/validation/cleanup/timeout and batch identity tests | PASS; provider call ceiling is 30 seconds; live latency was not measured in this historical baseline |

The focused upload/feed/workout/Coach/Avatar suite completed 64 tests in 0.97 seconds. These timings
only guard obvious local regressions; staging p50/p95 values must be captured from structured
`request_completed.duration_ms` logs after rollout.

## Defects fixed

- Community feed Avatar resolution previously issued one repository lookup per Avatar-bearing
  post. Feed rendering now performs one batch repository query per page.
- Creating an Avatar-bearing Community post previously repeated the identity read while building
  its response. The validated identity is now reused.
- Coach provider calls previously handled `TimeoutError` but did not impose a deadline. The service
  now enforces the same simple 30-second ceiling used by Avatar generation.

No cache, queue, or distributed performance infrastructure is justified by the available evidence.

## Release-candidate update — 2026-09-10

The table above is the historical Workstream 06 local baseline. Final provider choices are now
locked, but missing live credentials/fixtures and staging still prevent promotion of local timings
to production claims.

- ExerciseDB search, filters, details, and GIF URL retrieval passed live; public-service latency is
  not an availability guarantee.
- The retired OpenRouter Nemotron candidate passed 3/7 synthetic cases in 430.22 seconds; one
  isolated case passed in 51.62 seconds. SovereignEG `glm-5.3-flash` passed 5/7 cases in 65.82
  seconds on its first run. Two more runs are required before p50/p95 or release acceptance.
- Cloudflare FLUX completed one synthetic source-image live check in 9.53 seconds. Mistral OCR's
  private nine-case suite passes in 4.59 seconds, but a single aggregate duration is not p50/p95.
  Avatar private-fixture latency remains gated on explicit consent.
- API, feed, and workout local regression evidence remains valid; staging p50/p95 is still required.
