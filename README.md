# BONYAN

BONYAN is a modular Expo + FastAPI fitness application integrating authentication and
profiles, InBody OCR and progress, deterministic training, avatar generation, and a
privacy-aware community experience.

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

Before starting the API, set `AUTH_JWT_SECRET` in `apps/api/.env` to a random value of at
least 32 bytes. Do not commit that value. For example, generate one with
`python -c "import secrets; print(secrets.token_urlsafe(48))"` and paste the output into
the copied environment file.

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
npm run mobile:routes
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

Current provider status:

- OCR: Mistral `mistral-ocr-4-1` (`MISTRAL_API_KEY` is optional for mock/test flows).
- Exercises and media: MuscleWiki API (`MUSCLEWIKI_API_KEY` is optional for mock tests).
- Coach LLM: `TBD`; the deterministic `MockLLMProvider` is available without credentials.
- Avatar model: `TBD`; the metrics-driven `MockAvatarProvider` is available without
  credentials. The MVP intentionally does not upload a source photo.

See `docs/workstreams/01-core/INTEGRATION.md` before opening a feature PR.
