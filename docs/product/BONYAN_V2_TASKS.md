# BONYAN V2 tasks

## Owner real-data trial

- [x] Obtain explicit consent for the actual report/photo destinations and create a separate private local account.
- [x] Attempt one real OCR upload; record the provider's HTTP 429 and preserve failure visibility without paid retries.
- [x] Add a direct Avatar-to-report upload action and a native failed-OCR manual-review path; keep canonical units, unknown values and versioned confirmation.
- [x] Prevent generic muscle mass from being mistaken for skeletal muscle mass; use synthetic regression fixtures.
- [x] Verify and confirm actual report values through native manual review, then run exactly one approved real Avatar generation.
- [x] Render the real, unapproved private portrait on Android; verify sharing remains off and keep personal artifacts out of Git.
- [x] Run API/mobile regression and required checks: 329 API passes with 18 guarded skips; 107 mobile passes; lint/typecheck/routes/all-platform exports passed.
- [ ] Successful live OCR extraction remains blocked by the configured Mistral account's usage limit. No further OCR call is authorized in this trial.

## UI refinement — latest owner revision, 12 October

- [x] Remove the duplicate Home Coach card; retain the contextual panel and extend it to overview screens.
- [x] Add green action, selected-control and progress accents alongside BONYAN bronze.
- [x] Replace logging steppers with swipe wheels, exact numeric entry, accessible alternatives and a fixed logging action; preserve canonical kg, recovery and transaction guards.
- [x] Reduce Avatar setup and metric density; move optional privacy/history/help to the top-right info sheet and preserve explicit consent/release warnings.
- [x] Retire feed/publication UI and redirect legacy links to League; preserve stored data and privacy APIs.
- [x] Improve Profile identity, training/photo editing, persisted language/units, optional history and account management; retain deletion confirmation.
- [x] Run mobile regression, lint, TypeScript, route generation, all-platform exports and bilingual Android interaction QA; record scope in BONYAN_V2_QA.md.

Current mobile result: 104 tests passed in 26 files. This UI revision does not change backend schemas/services or call paid providers. Historical entries below describe earlier iterations; the latest owner revision supersedes their feed and accent decisions.

- [x] Read supplied master prompt/concept; safely extract 25 reference screens; audit baseline.
- [x] A: Typed persisted locales, shared RTL/error states, five-tab shell and contextual Coach.
- [x] B: Rich shared exercise media/details, plan/picker/session parity and session recovery.
- [x] C: Versioned session snapshot, preview/approve/reject/undo, scopes, locking, idempotency and audit.
- [x] D: Confirmed measurements, private consented Avatar revisions/provenance, granular community privacy.
- [x] E: Progress Score, capped game events/XP/missions, seasons/leagues/challenges, reward wallet.
- [x] F: Today hierarchy and existing auth/onboarding/nutrition/community/profile/notification flows.
- [x] G: Available locale/security/concurrency/E2E checks, additive migration validation, visual QA and documentation. External checks are listed separately below.

## Concept alignment correction — 12 October

- [x] Replace the old social tab with League, preserve feed/deep links and highlight related routes.
- [x] Match the concept hierarchy on Today, Avatar, League and Coach; use real state and honest missing-data illustrations.
- [x] Show animated exercise demonstrations on initial manual browsing, muscle filters, selection, review and existing plan cards; preserve capped selections across pages.
- [x] Improve Arabic typography with bundled Cairo and remove fixed-action competition in the manual builder.
- [x] Validate the changes with native Android visual/interaction QA, authenticated catalog-filter tests, full API/mobile regression, lint/TypeScript and release exports.

The correction run passed 328 API tests (17 external skips), 98 mobile tests, lint/TypeScript and
Android/iOS/web exports. Manual QA selected Cable Crossover, showed its animation in search and
review, and created only a draft; the current plan and active workout stayed intact. Arabic QA
uses the same authoritative game/catalog state and dedicated Cairo typography. Latest captures
and precise platform limits are recorded in BONYAN_V2_QA.md. Earlier entries below remain history.

## Check log

Baseline: lint/TypeScript passed; 69 mobile tests and 294 API tests passed, 18 opt-in tests skipped. Android main-baseline boot and API health/readiness verified before V2.

A: Mobile lint/TypeScript and 75 tests passed. B/C: additive migration applied to isolated PostgreSQL; real database concurrent approval retry, rollback, ownership, stale/expired proposals, undo and original-set attribution checks passed. Exercise thumbnails/details and server-timestamp rest/previous-performance controls connected. Full bilingual and visual QA remains in F/G.

D foundation: consent-gated photos, immutable private Avatar measurement snapshot, daily generation budget/flag, revocable granular sharing, mutual blocking, portable data export and deletion coverage implemented. Migration applied; real PostgreSQL feed masking/revocation/blocking checks passed. Full regression: 300 API passed, 20 opt-in skipped; mobile lint/TypeScript and 75 tests passed. Moderation controls and remaining visual/provenance presentation continue in F/G.

E ledger: versioned weighted Progress Score with coverage, server-timed event deduplication, frozen weekly targets/timezone, normalized/capped mission points, XP and reversible awards implemented with workout/confirmed-meal hooks. Added bilingual missions and score details, export/deletion propagation. Migration applied. PostgreSQL concurrency/cap/reversal/owner/backfill checks and deterministic rules tests: 9 passed; regression 308 API passed, 21 opt-in skipped. League/challenges/wallet follows next.

E community: persisted configurable seasons and comparable weekly cohorts (50 members), opt-in Weekly/Friends/All-time rankings, mutual invitation codes, seven-day capped-point challenges, badge wallet and disabled partner claims implemented. Sharing respects separate name/Avatar/progress permissions and mutual blocking. Migration 0017 applied; isolated PostgreSQL ledger/social checks: 10 passed. Regression: 308 API passed, 22 opt-in skipped; mobile lint, TypeScript and 75 tests passed. Today integration and visual QA remain.

F Today/Coach: reference hierarchy connected to canonical next/resumed workout, coverage-aware Progress Score/XP, comparable recorded trends, private Avatar, missions and league. Coach reads the active canonical session, persists recoverable preview-only proposals, shows explicit scope/persistent-edit approvals and refreshes authoritative state. Wrong-language replies fail safely; earlier replies from another locale show a localized archive notice. Workout recovery selects the newest server version. Focused PostgreSQL/Coach checks: 48 passed; regression: 311 API passed, 22 opt-in skipped; mobile lint/TypeScript and 79 tests passed. Remaining screen-localization and visual QA continue.

D completion: optimistic versioned human measurement review with device/date provenance; immutable confirmed inputs, Avatar revision history, illustration/uncertainty disclosures, explicit public-post preview and production provider release gate implemented. Added authenticated server-configured moderator queue, audited idempotent hide/restore, private report export/deletion and community limits. Migration 0018 applied. Focused InBody/community/moderation checks including real PostgreSQL: 76 passed. Regression: 313 API passed, 22 opt-in skipped; mobile lint/TypeScript and 79 tests passed. Supplied-screen visual comparison remains in G; provider benchmarks require an approved manifest before production enablement.

B/F completion: shared catalog form details across manual picker, plan cards, active sessions and proposed alternatives; explicit completion review, localized previous performance, canonical kg storage with pound display, Arabic numeral inputs and persisted intro/auth language switching. Migrated remaining conditional copy to the typed catalog; safe errors cover upload clients. Development Avatar fixtures disclose their limitations and cannot enter public identities. Regression: 314 API passed, 22 opt-in skipped; mobile lint/TypeScript and 84 tests passed. Android Today boot verified; compact/RTL visual QA continues in G.

E/F/G integration: historical and revocable badge evidence, separately opted-in public badges, idempotent challenge replies, real private invitation notifications, locked nutrition response locale and complete bilingual HTTP journeys implemented. Production catalog licensing is explicitly gated; provider credits and true GIF/video handling are connected. Live QA corrected ExerciseDB's current bodyweight filter and prevented exact-difficulty queries from excluding easier compatible alternatives; deterministic selection rejects harder movements, stretches and conflicting known movement patterns. Fresh PostgreSQL upgrade, metadata comparison, V2 downgrade/re-upgrade passed after matching ORM constraints/index names to migrations. Full configured regression with isolated PostgreSQL and public ExerciseDB live check: 327 passed, 17 opt-in skipped (not passes). Arabic browser approval retained original logs, replaced only remaining sets and completed the session with an authoritative refresh.

F/G completion: centralized remaining profile/measurement/nutrition labels and numeric inputs, consistent persisted global locale/RTL, Expo video playback, canonical rest timers and invitation notifications. Low-coverage internal estimates are hidden from Today, score details and history. Android 360×640 QA caught primary-action clipping; compact Today spacing now keeps Start workout visible, and the Avatar strip preserves room for the private illustration/setup state. Final mobile lint/TypeScript, 92 tests, API Ruff and Android/iOS/web release exports passed. A non-root API container built and passed health/readiness checks with an allowlisted build context excluding secrets/uploads. Two explicitly approved short live SovereignEG Coach checks passed in English/Egyptian Arabic without plan changes; repeated paid calls were avoided. [QA evidence and remaining gates](BONYAN_V2_QA.md).

G approved interaction: synthetic local league opt-in passed in both locales, exposing only anonymous membership and earned points while name/Avatar/Progress Score stayed private. Low coverage correctly retained unranked status. Leaving the league removed the entry, and the test account returned to its initial private state.

## External release checks — not passed

- [ ] Physical iPhone/native iOS validation and native MP4 playback with an approved source fixture.
- [ ] Approved Avatar/OCR fixtures and provider quality benchmarks; enable the production Avatar flag only after review.
- [ ] Commercial exercise-media/dataset rights for production/staging before enabling the license flag.
- [ ] Full existing opt-in provider/staging/local-experience suites (17 skips remain; see QA report).
- [ ] Verified partner integrations before enabling voice/redemption, plus existing production email-domain setup.
