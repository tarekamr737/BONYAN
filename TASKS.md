# BONYAN Workstream 01 — Core Platform Tasks

## A. Bootstrap
- [ ] Create `apps/mobile` Expo + TypeScript project.
- [ ] Create `apps/api` FastAPI project.
- [ ] Add repo scripts for install/dev/test/lint/typecheck.
- [ ] Add secret-free `.env.example` files.
- [ ] Add local setup README.

## B. Mobile Core
- [ ] Implement design tokens from prototype.
- [ ] Add reusable button/input/card/loading/error primitives.
- [ ] Configure Expo Router.
- [ ] Add unauthenticated route group.
- [ ] Add authenticated app shell.
- [ ] Add typed API client.
- [ ] Add TanStack Query provider.
- [ ] Add shared API error handling.

## C. Backend Core
- [ ] Add validated settings module.
- [ ] Bootstrap FastAPI app.
- [ ] Add `/health` endpoint.
- [ ] Add standardized errors.
- [ ] Add safe structured logging.
- [ ] Add request correlation ID.

## D. Database
- [ ] Configure PostgreSQL + SQLAlchemy 2.
- [ ] Configure Alembic.
- [ ] Create initial user/profile migration.
- [ ] Add DB session/repository dependency.
- [ ] Verify migration from clean DB.

## E. Authentication
- [ ] Implement auth integration.
- [ ] Add current-user dependency.
- [ ] Add unauthorized/forbidden tests.
- [ ] Derive user ID from trusted auth context.

## F. User / Onboarding
- [ ] Create profile schemas/repository/service.
- [ ] Add `GET /api/v1/me`.
- [ ] Add `PATCH /api/v1/me`.
- [ ] Implement onboarding screens.
- [ ] Persist onboarding completion.
- [ ] Implement profile/settings screen.

## G. Shared Interfaces
- [ ] Create `LLMProvider` + mock.
- [ ] Create `AvatarProvider` + mock.
- [ ] Add `CHAT_MODEL=TBD`.
- [ ] Add `AVATAR_MODEL=TBD`.

## H. Storage / Security
- [ ] Create private object-storage interface.
- [ ] Add private upload/delete primitives.
- [ ] Add authorization helper tests.
- [ ] Verify logs exclude sensitive content.

## I. CI
- [ ] Add backend lint/test CI.
- [ ] Add mobile lint/typecheck/test CI.
- [ ] Add migration validation.
- [ ] Confirm CI passes.

## J. Integration
- [ ] Publish integration contract.
- [ ] After WS2 merge, register InBody modules.
- [ ] After WS3 merge, register Training modules.
- [ ] After WS4 merge, register Avatar/Community modules.

## K. Final
- [ ] Fresh clone setup works.
- [ ] Mobile boots.
- [ ] API boots.
- [ ] Auth/onboarding/profile work.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Tests pass.
