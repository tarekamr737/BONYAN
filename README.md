# BONYAN

BONYAN is a modular Expo + FastAPI application. This branch establishes the shared
platform baseline only; product features remain owned by their workstreams.

## Prerequisites

- Node.js 24 and npm 11
- Python 3.12–3.14
- Docker (recommended for the local PostgreSQL database)

## Install

From the repository root:

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\Activate.ps1
npm run api:install
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

On macOS/Linux, activate Python with `source .venv/bin/activate` and copy the
environment examples with `cp`.

## Run locally

Start PostgreSQL and migrate once:

```powershell
docker compose -f infra/compose.yaml up -d postgres
npm run api:migration
```

Run the API and mobile app in separate terminals with the virtual environment active:

```powershell
npm run api:dev
npm run mobile:dev
```

The public health check is `GET http://127.0.0.1:8000/health`. Expo prints the
device, emulator, and web launch options when it starts.

## Validate

```powershell
npm run mobile:lint
npm run mobile:typecheck
npm run mobile:test
npm run api:lint
npm run api:test
```

Mobile dependencies are managed by the root npm workspace. Backend dependencies
are declared in `apps/api/pyproject.toml`.

## Architecture

- `apps/mobile/app`: Expo Router composition owned by Workstream 01.
- `apps/mobile/src/core`: shared mobile providers, API client, tokens, and primitives.
- `apps/mobile/src/features`: workstream-owned feature modules.
- `apps/api/app/core`: FastAPI bootstrap, routing, settings, DB sessions, errors, and logging.
- `apps/api/app/domains`: workstream-owned domain packages.
- `apps/api/app/integrations`: workstream-owned production provider adapters.

Provider selection remains intentionally unresolved. Local development uses
`MockLLMProvider` and `MockAvatarProvider`; `CHAT_MODEL` and `AVATAR_MODEL` remain `TBD`.

See `docs/workstreams/01-core/INTEGRATION.md` before opening a feature PR.
