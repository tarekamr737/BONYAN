# BONYAN Workstream 01 — Core Platform Tasks

## A. Bootstrap
- [x] Create `apps/mobile` Expo + TypeScript project.
- [x] Create `apps/api` FastAPI project.
- [x] Add repo scripts for install/dev/test/lint/typecheck.
- [x] Add secret-free `.env.example` files.
- [x] Add local setup README.

## B. Mobile Core
- [x] Implement design tokens from prototype.
- [ ] Add reusable button/input/card/loading/error primitives.
- [x] Configure Expo Router.
- [ ] Add unauthenticated route group.
- [ ] Add authenticated app shell.
- [x] Add typed API client.
- [x] Add TanStack Query provider.
- [x] Add shared API error handling.

## C. Backend Core
- [x] Add validated settings module.
- [x] Bootstrap FastAPI app.
- [x] Add `/health` endpoint.
- [x] Add standardized errors.
- [x] Add safe structured logging.
- [x] Add request correlation ID.

## D. Database
- [x] Configure PostgreSQL + SQLAlchemy 2.
- [x] Configure Alembic.
- [ ] Create initial user/profile migration.
- [x] Add DB session/repository dependency.
- [x] Verify migration from clean DB.

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
- [x] Create `LLMProvider` + mock.
- [x] Create `AvatarProvider` + mock.
- [x] Add `CHAT_MODEL=TBD`.
- [x] Add `AVATAR_MODEL=TBD`.

## H. Storage / Security
- [ ] Create private object-storage interface.
- [ ] Add private upload/delete primitives.
- [ ] Add authorization helper tests.
- [ ] Verify logs exclude sensitive content.

## I. CI
- [x] Add backend lint/test CI.
- [x] Add mobile lint/typecheck/test CI.
- [x] Add migration validation.
- [ ] Confirm CI passes.

## J. Integration
- [x] Publish integration contract.
- [ ] After WS2 merge, register InBody modules.
- [ ] After WS3 merge, register Training modules.
- [ ] After WS4 merge, register Avatar/Community modules.

## K. Final
- [x] Fresh clone setup works.
- [x] Mobile boots.
- [x] API boots.
- [ ] Auth/onboarding/profile work.
- [x] Lint passes.
- [x] Typecheck passes.
- [x] Tests pass.
