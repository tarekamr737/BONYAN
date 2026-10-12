# BONYAN V2 implementation contract

Authoritative input: `agent-input/BONYAN_V2/BONYAN_V2_Codex_Kit/MASTER_PROMPT.md`.
Baseline: `5f5e767`. Branch: `feat/bonyan-v2-game-fitness`.

## Audit and gap matrix

| Area | Working baseline to reuse | Required extension |
|---|---|---|
| Identity | First-party auth, verified registration, profile/onboarding, secure storage | Persisted typed Egyptian Arabic/English locale, shared RTL and safe error copy |
| Navigation | Protected Expo Router stacks, taskbar, design tokens | Today / Train / Avatar / Nutrition / Community; contextual Coach and header actions |
| Training | Shared ExerciseDB catalog/media relay, manual/engine plans, set logging/recovery | Canonical session prescription snapshot, rich shared previews, versioned transactional substitutions |
| Coach | Provider adapters, authorized context tools, chat history | Locked response locale; read/draft-only tools; explicit preview/approval/scopes |
| Measurements | OCR review/confirmation, append-only assessment history | Confirmed-source provenance and consented private Avatar revisions |
| Avatar/community | Private storage, approval/publication, feed/reports/reactions | Granular revocable privacy, block/export flows, truthful missing-data states |
| Scores | Daily nutrition/workout score and personal coaching score | Separate coverage-aware Progress Score; authoritative capped XP/mission ledger |
| Competition | No league/reward ledger | 28-day seasons, weekly opted-in leagues, challenges, badges, disabled partner redemption |
| QA | 69 mobile / 294 backend baseline tests | Locale/RTL, auth, transaction/concurrency, anti-cheat, lifecycle and visual checks |

## Decisions

- Keep the modular monolith, authenticated `/api/v1`, existing media/provider adapters and additive migrations.
- The supplied four-screen concept owns hierarchy; repository tokens own colors/type. Reference images are never user data or licensed exercise media.
- The user's 12 October visual correction replaces the old Community tab destination with League.
  The latest revision removes feed/publication UI; legacy routes redirect to League and stored data stays protected. Green complements bronze, Home uses one persistent Coach panel, logging uses swipe/exact selectors, and Avatar/Profile keep optional details behind info controls. Today, private Avatar, League and Coach use the concept's compact
  headers and connected hierarchy; catalog demonstrations are visible before exercise selection.
- Locale is `en` or `ar-EG`; legacy `ar` normalizes to `ar-EG`. Unknown API errors get localized safe copy.
- Session prescription is captured at start. Approved substitutions replace only unlogged remaining sets; original logged-set attribution remains immutable. Session/plan/equipment approvals are distinct and owner-scoped.
- Progress Score v1 weights: training 35%, personal goals 25%, recovery 20%, nutrition 20%. Missing evidence is unknown; score requires at least 60% coverage and league eligibility never uses raw body composition.
- Below the coverage threshold, Today, score details and recorded history show unknown; internal partial estimates and non-comparable trends are never displayed as earned scores.
- Server time and user timezone determine award windows. Unique event keys, capped daily/weekly awards, immutable ledger and revocation prevent duplicate/backdated claims. No migration backfill awards.
- Avatar is a private measurement-informed illustration, not a clinical model. Regeneration/publication require separate opt-in. Decorative badges never change physiological inputs.
- Voice and partner redemption remain explicitly disabled until actual permissioned integrations and release gates are available.
- Production/staging Avatar generation also requires `AVATAR_PROVIDER_RELEASE_APPROVED=true` after the existing provider benchmark/release review; otherwise the capability is visibly disabled. Development mocks remain available and clearly labeled.
- Production/staging ExerciseDB access requires `EXERCISE_CATALOG_LICENSE_APPROVED=true` only after verifying commercial rights and the deployed dataset. The [official licensing documentation](https://oss.exercisedb.dev/docs) requires a paid plan for commercial use and AscendAPI attribution. Development may use the public prototype dataset; the UI exposes catalog availability and media credits, and saved session logging remains usable when the provider is disabled. Unverified difficulty metadata remains conservative; the selector never fabricates beginner suitability.
- Historical badges use net, reversible ledger evidence grouped by their original server week. Balanced-week badges survive rollover, revoked evidence removes eligibility, and public badge visibility requires its own opt-in.
- Community moderation uses authenticated IDs in `MODERATOR_USER_IDS` (empty by default), cursor-paged pending reports and audited hide/dismiss/restore decisions. Clients cannot grant themselves this role. Hidden posts disappear from feed/reaction access. `RATE_LIMIT_COMMUNITY_PER_MINUTE` defaults to 60 per authenticated user.
- InBody review records a device label, measurement date and increasing measurement version inside the existing JSON result. Confirmation freezes that version; stale edits and future measurement dates fail safely. Avatar revisions retain immutable private inputs and expose only provenance metadata.
- New V2 modules are owned by this approved mandate. Existing uncommitted work outside this checkout remains untouched.

## Verification

Record each slice's actual checks in BONYAN_V2_TASKS.md. Android emulator QA is available; physical iPhone and licensed partner/provider release gates remain external checks, never inferred passes.

The completed local check results, screenshot evidence and explicit outstanding release gates are in [BONYAN_V2_QA.md](BONYAN_V2_QA.md). API container builds use the root `.dockerignore` allowlist to keep local credentials, uploads and unrelated artifacts out of all build layers.
