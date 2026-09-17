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

Provider selection is locked for the release candidate while domain code remains provider-neutral.
Local development and CI can explicitly use `MockLLMProvider` and `MockAvatarProvider` without
production credentials.

Current provider status:

- OCR: Mistral `mistral-ocr-4-1` (`MISTRAL_API_KEY` is optional for mock/test flows).
- Exercises and media: ExerciseDB V1 Free API; no credential is required.
- Coach LLM: SovereignEG `glm-5.3-flash`; `MockLLMProvider` is available for offline development.
- Avatar model: OpenRouter `meta/muse-image`; `MockAvatarProvider` is available for offline
  development. Source photos stay private and require explicit approval before publication.

See `docs/providers/CONFIGURATION.md` for current backend-only environment variables and
`docs/providers/DECISIONS.md` for provider rationale and remaining release risks.

See `docs/workstreams/01-core/INTEGRATION.md` before opening a feature PR.

For the current shared-`main` branch workflow and team testing rules, see
[CONTRIBUTING.md](CONTRIBUTING.md).
