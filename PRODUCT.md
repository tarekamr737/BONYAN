# BONYAN Workstream 01 — Core Platform

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
