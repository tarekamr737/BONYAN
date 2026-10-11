# BONYAN V2 tasks

- [x] Read supplied master prompt/concept; safely extract 25 reference screens; audit baseline.
- [x] A: Typed persisted locales, shared RTL/error states, five-tab shell and contextual Coach.
- [ ] B: Rich shared exercise media/details, plan/picker/session parity and session recovery.
- [x] C: Versioned session snapshot, preview/approve/reject/undo, scopes, locking, idempotency and audit.
- [ ] D: Confirmed measurements, private consented Avatar revisions/provenance, granular community privacy.
- [ ] E: Progress Score, capped game events/XP/missions, seasons/leagues/challenges, reward wallet.
- [ ] F: Today hierarchy and all existing auth/onboarding/nutrition/community/profile/notification flows.
- [ ] G: Full locale/security/concurrency/E2E checks, additive migration validation, visual QA and documentation.

## Check log

Baseline: lint/TypeScript passed; 69 mobile tests and 294 API tests passed, 18 opt-in tests skipped. Android main-baseline boot and API health/readiness verified before V2.

A: Mobile lint/TypeScript and 75 tests passed. B/C: additive migration applied to isolated PostgreSQL; real database concurrent approval retry, rollback, ownership, stale/expired proposals, undo and original-set attribution checks passed. Exercise thumbnails/details and server-timestamp rest/previous-performance controls connected. Full bilingual and visual QA remains in F/G.
