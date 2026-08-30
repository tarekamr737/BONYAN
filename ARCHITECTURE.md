# BONYAN Workstream 01 — Core Platform Architecture

## Style
Use a modular monolith with two apps:

```text
apps/
├── mobile/   # Expo + React Native
└── api/      # FastAPI
```

## Repository Shape
```text
BONYAN/
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   └── src/{core,features}/
│   └── api/app/{core,domains,integrations}/
├── docs/workstreams/
├── tests/
├── infra/
└── .github/
```

## Backend Layers
```text
HTTP route → service → repository → PostgreSQL
                   ↓
            provider interface → adapter
```
Provider SDKs never leak into domain code.

## User Domain
Owns identity reference, profile, preferences and onboarding state.
Does not own InBody scans, workout plans/sessions, avatars or community posts.

## Provider Contracts
Production providers remain undecided:

```python
class LLMProvider(Protocol):
    async def complete(self, request: LLMRequest) -> LLMResponse: ...

class AvatarProvider(Protocol):
    async def generate(self, request: AvatarRequest) -> AvatarResult: ...
```

Mocks are mandatory for local development/tests.

## Mobile
```text
app/          # Expo Router composition
src/core/     # auth, API client, theme, shared utilities
src/features/ # feature-owned modules
```
Use TanStack Query for server state. Keep UI state local unless a real cross-screen need exists.

## API
Base path: `/api/v1`.

Shared error shape:
```json
{"error":{"code":"stable_machine_code","message":"safe user-facing message"}}
```

## Authentication / Authorization
The core user domain owns first-party email/password accounts. Passwords are stored as
salted scrypt hashes and successful registration/login returns a short-lived HS256 access
token. Mobile stores the token in platform secure storage (session storage on web).

For every private route:
1. authenticate caller
2. derive trusted `user_id`
3. scope DB query to that user
4. never authorize from request-supplied ownership IDs alone

## Storage
Private storage abstraction must support put, short-lived access, delete and metadata. Raw photos and InBody documents are never public by default.

## Configuration
```text
DATABASE_URL=
AUTH_...=
STORAGE_...=
CHAT_MODEL=TBD
AVATAR_MODEL=TBD
```
Feature-specific secrets live with their owning adapters.

## Observability
Use structured logs and request correlation IDs. Never log sensitive body data or private-file contents.

## Parallel Integration
WS2–WS4 expose routers/screens/modules. WS1 performs central registration after merge to minimize shared-file conflicts.

## Dependency Direction
```text
Core/User
  ↑
  ├── InBody
  ├── Training
  └── Avatar/Community
```
Training may read confirmed InBody domain data but never call OCR directly.

## Deployment
Keep it simple: one mobile app, one FastAPI service, one PostgreSQL DB, one private object store. No queues, brokers, microservices or vector DB unless later proven necessary.
