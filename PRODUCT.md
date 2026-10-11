# BONYAN V2

Register: product. North Star: **Build Your Real-Life Character. Train in real life. Level up in BONYAN.**

The approved V2 mandate supersedes the historical workstream scope and non-goals below.
Implement the integrated, private, evidence-aware fitness platform in Egyptian Arabic and English:
confirmed InBody measurements and consented photos inform a private illustrative Avatar;
real workouts and sustainable nutrition/recovery earn capped server-authoritative XP and missions.
Progress is goal-relative, never attractiveness or a medical grade. Five destinations: Today, Train,
Avatar, Nutrition, Community. Coach edits require preview, explicit scope, approval and atomic commit.

Preserve Human Foundry tokens, ownership/security, useful services, existing data and additive migrations.
No fake user metrics, ornamental glow or neon. Voice and partner redemption are disabled until genuine
permissioned integrations pass release gates. Granular consent, private media and deletion/export apply.
Canonical decisions and active checkboxes: `docs/product/BONYAN_V2.md`, `docs/product/BONYAN_V2_TASKS.md`.

## Historical foundation (retained context, superseded product restrictions)

## Purpose
Create the shared mobile/backend foundation that every BONYAN feature depends on.

## Product Outcome
A user can open BONYAN, authenticate, complete onboarding, manage a profile, and securely use the common application shell that hosts InBody, Training, Avatar and Community features.

## Owns
### Mobile
- Expo/React Native bootstrap
- global navigation
- auth route groups
- shared design tokens/components
- shared API client
- loading/error/empty states
- onboarding
- profile/settings shell

### Backend
- FastAPI foundation
- configuration and env validation
- auth integration
- user/profile domain
- PostgreSQL connection
- Alembic migrations
- shared errors/logging
- health/readiness endpoints
- authorization helpers
- private file-storage interface
- provider interfaces for undecided AI models

### Delivery
- local development scripts
- lint/typecheck/test setup
- CI
- deployment configuration
- `.env.example`
- baseline setup documentation

## User Stories
1. A new user can create/sign in to BONYAN.
2. A new user can complete onboarding.
3. A returning user can access profile and app tabs securely.
4. A user cannot access another user's private resources.
5. A developer can run mobile + API locally from documented commands.
6. Other workstreams can integrate through stable contracts without modifying core internals.

## MVP Profile Fields
Keep minimal and extensible:
- display name
- preferred language
- age/date of birth where product-approved
- sex where needed for training calculations
- height
- training goal
- experience level
- available training days
- available equipment/gym access
- preferred units
- timezone
- onboarding completion state

Do not duplicate measurements owned by InBody.

## Acceptance Criteria
- Mobile and API boot successfully.
- `/health` passes.
- Public/private routes are separated.
- Profile can be read/updated.
- Private endpoints reject unauthenticated access.
- Cross-user access is rejected.
- Migrations run from a clean DB.
- Secrets are environment-only.
- `LLMProvider` and `AvatarProvider` mocks work without production credentials.
- WS2–WS4 can plug in without changing core domain logic.

## Non-Goals
- InBody OCR/Mistral integration
- workout generation
- MuscleWiki integration
- AI coach implementation
- avatar provider implementation
- community feed implementation
- nutrition
- live voice coach
- microservices or event-bus architecture

## Constraint
`https://bonyan-mobile.vercel.app/` is the UX baseline. Prioritize a simple, secure MVP over breadth.
