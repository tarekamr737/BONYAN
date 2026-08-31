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
| Coach | Mock behavior and enforced timeout regression test | PASS; provider call ceiling is 30 seconds; live latency blocked on Person 05/provider access |
| Avatar | Mock generation/validation/cleanup/timeout and batch identity tests | PASS; provider call ceiling is 30 seconds; live latency blocked on Person 05/provider access |

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
