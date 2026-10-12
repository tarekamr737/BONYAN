# BONYAN V2 shared development baseline

Date: 12 October 2026. Implementation branch: `feat/bonyan-v2-game-fitness`.

The owner authorized publication and merge of V2 into `main` for parallel team
development. Merge requires the exact PR head to pass the protected branch's
`mobile`, `api`, and `release-container` checks. After merge, new branches start
from `origin/main`; the V2 implementation branch is historical.

## Included behavior

- English and Egyptian Arabic flows, persisted locale/RTL and five tabs: Today,
  Train, Avatar, Nutrition and League. Legacy feed routes redirect to League.
- Green and bronze design accents, visual exercise selection/demonstrations,
  swipe/exact set logging, compact Avatar/Profile and contextual Coach access.
- Versioned workout substitutions with preview, explicit approval, scope,
  ownership checks and immutable logged-set attribution.
- Private confirmed measurement provenance and consented Avatar revisions;
  failed OCR can be reviewed manually without guessing missing values.
- Separate coverage-aware Progress Score and capped, reversible XP/missions,
  opted-in leagues/challenges, badges and a gated rewards wallet.

## Evidence and limits

Latest local regression: 329 API tests passed with 18 guarded tests skipped,
107 mobile tests passed, lint/typecheck/routes and all-platform release exports
passed. Android English/Arabic interaction, API readiness, private data ownership,
database journeys, migration reversibility and secret checks have recorded
evidence in [the V2 QA report](../product/BONYAN_V2_QA.md). CI additionally runs
PostgreSQL upgrade/drift/rollback checks and builds the API container.

The approved real-data trial produced one private Avatar for review. Mistral
returned a usage-limit error; report values were confirmed manually. Personal
reports, photos, credentials and generated outputs remain ignored local data.

This is a development baseline. Store/production distribution still needs native
iOS and signed artifact QA, provider quality/privacy review, exercise catalog
commercial rights, production email setup and deployment/recovery evidence.
Existing production provider/license gates remain enforced. Voice and partner
redemption remain disabled. See [the release checklist](checklist.md).

## Parallel development

With a clean checkout, each teammate runs:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feat/<task-name>
```

Preserve uncommitted changes before switching. Use independent clones or Git
worktrees when working on multiple tasks. Follow [CONTRIBUTING.md](../../CONTRIBUTING.md)
for routing/configuration/migration/lockfile coordination and PR checks. Use local
mock providers by default; sharing the owner's `.env` or private trial files is
unnecessary. Follow [README.md](../../README.md) for setup and
[the team device guide](team-device-installation.md) for device connections.

Merging `main` triggers the existing staging API image publication workflow. An
image publication does not deploy a hosted API or publish a store build. Keep
production tags and deployment approval separate from the development merge.
