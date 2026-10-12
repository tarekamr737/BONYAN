# BONYAN V2 — Platform Agent Rules

## Active V2 mandate
The approved V2 master prompt supersedes the legacy product, design, branch and
workstream implementation scope below for this feature. Implement the complete
V2 vertical slices on `feat/bonyan-v2-game-fitness`, preserving existing work and
security/architecture/quality rules. Canonical decisions and active checkboxes:
`docs/product/BONYAN_V2.md` and `docs/product/BONYAN_V2_TASKS.md`.

## Shared baseline after the V2 merge
Once this implementation PR is merged, V2 is the shared development baseline.
Start each subsequent task on its own short-lived feature branch from current
`origin/main`; do not keep implementing on the merged V2 branch. This supersedes
the fixed branch below for post-merge tasks. Follow `CONTRIBUTING.md` for shared
file ownership and `docs/release/v2-development-baseline.md` for the handoff.

## Engineering Principles

All implementation must follow:

- SOLID — keep responsibilities focused; depend on abstractions at real variation boundaries.
- DRY — extract genuine repeated knowledge, not merely similar-looking code.
- KISS — choose the simplest design that correctly solves the current requirement.
- GRASP — assign responsibility to the object/module that owns the relevant information; favor high cohesion and low coupling.
- Law of Demeter — communicate through direct collaborators; do not reach through another domain's internals.
- AHA — avoid premature abstractions. Prefer duplication over the wrong abstraction until a stable shared concept is clear.
- YAGNI — do not build capabilities that are not required by PRODUCT.md or the active TASKS.md item.

Priority when principles appear to conflict:

1. Correctness
2. Security/privacy
3. KISS
4. High cohesion / low coupling
5. AHA / YAGNI
6. DRY

Do not create an abstraction solely to remove two small pieces of coincidentally similar code.
Do not add interfaces unless there is a real boundary, multiple implementations, test seam, or known source of variation.

## Mission
Build and own BONYAN's shared production foundation so all other workstreams can develop safely in parallel.

## Repository
- Repo: https://github.com/tarekamr737/BONYAN
- Branch: `feat/bonyan-v2-game-fitness`
- Prototype: https://bonyan-mobile.vercel.app/
- V2 concept and extracted screen designs own visual hierarchy; existing tokens own brand styling.
- PRODUCT.md explicitly authorizes the complete V2 redesign.

## Owned Paths
- `apps/mobile/src/core/**`
- `apps/mobile/src/features/auth/**`
- `apps/api/app/core/**`
- `apps/api/app/domains/users/**`
- `infra/**`
- `.github/**`
- root config files
- central mobile navigation/router integration
- central FastAPI router integration

## Forbidden Ownership
Legacy parallel-workstream boundaries (superseded for approved V2 slices; preserve other uncommitted work):
- Workstream 02: InBody/OCR
- Workstream 03: Training/MuscleWiki/Coach
- Workstream 04: Avatar/Community

## Stack
- Mobile: Expo + React Native + TypeScript
- Routing: Expo Router
- API: FastAPI
- Validation: Pydantic v2
- Database: PostgreSQL
- ORM: SQLAlchemy 2
- Migrations: Alembic
- Server state: TanStack Query
- Secrets: backend only

## Architecture Rules
- Keep a modular monolith.
- No microservices or agent frameworks.
- Keep endpoints thin; services own business logic; repositories own DB access.
- External providers live behind interfaces/adapters.
- Keep shared contracts typed, small and stable.
- Do not couple domains to provider SDKs.

## Shared Provider Interfaces
Create but do not choose production providers:
- `LLMProvider`
- `AvatarProvider`

Use:
- `CHAT_MODEL=TBD`
- `AVATAR_MODEL=TBD`

Provide mocks so development never blocks on model selection.

## Security
- Never commit secrets.
- Validate environment variables at startup.
- Authenticate every private endpoint.
- Enforce resource ownership server-side.
- Never trust request-supplied IDs for authorization.
- Never log private uploads or sensitive body data.
- Use private object storage for user files.

## API Rules
- Version routes under `/api/v1`.
- Use Pydantic request/response models.
- Standardize safe error responses.
- Store timestamps in UTC.
- Avoid exposing internal DB fields.

## Git / Parallel Rules
- Work only on `feat/bonyan-v2-game-fitness` for this mandate; never change main directly.
- Never rewrite another workstream's owned files.
- Other workstreams export routers/screens/modules.
- This workstream performs final central registration after merges.
- Keep commits small and coherent; prefer squash merge.

## Testing
Before completion run lint, typecheck and relevant tests.
Verify mobile boot, API boot and health endpoint.
Do not mark skipped checks as passed.

## Definition of Done
Implementation exists, checks pass, secrets stay out of Git, authorization is correct, and changes stay inside owned boundaries.

## Token Efficiency
- Read this file first, then only the active TASKS.md item and relevant files.
- Do not repeatedly scan the repo.
- Reuse code before adding abstractions.
- Work one checkbox at a time.
- Do not rewrite docs unless architecture changed.
- End each iteration with only: changed files, tests, blocker, next task.
