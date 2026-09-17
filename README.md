# BONYAN

BONYAN is a mobile-first fitness app built with Expo, React Native, and FastAPI.
It brings a member's profile, InBody report review, training, AI Coach,
image-based Avatar, nutrition, and privacy-aware Community into one experience.
The app supports English and Egyptian Arabic.

> **Project status:** `main` is the shared development baseline for team testing,
> not a store-ready release. The previous Android staging build is older than
> `main`, and its temporary API tunnel was unavailable at the last check. Run
> the app locally for now; see the [team device guide](docs/release/team-device-installation.md)
> before distributing a new build.

## Repository at a glance

| Path | Purpose |
| --- | --- |
| `apps/mobile` | Expo Router app for Android, iOS, and web |
| `apps/api` | FastAPI backend, domain services, provider adapters, and migrations |
| `infra` | Local PostgreSQL Compose configuration |
| `docs` | Architecture, provider decisions, team testing, and release procedures |

The backend owns authentication, private files, OCR, provider calls, and
business rules. The mobile app contains no provider credentials. API routes
are versioned under `/api/v1`.

## Requirements

- Node.js 24 and npm 11
- Python 3.12–3.14
- Docker with Compose for the documented local PostgreSQL setup
- Expo Go or an Android emulator for mobile testing

Keep the repository and local tooling on a drive with enough free space. On
Windows, a D:-resident checkout avoids using a full system drive.

## Quickstart

Run these commands from the repository root. The PowerShell examples assume a
new checkout; use equivalent `cp` and virtual-environment activation commands
on macOS or Linux.

```powershell
npm ci
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e "apps/api[dev]"
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

In `apps/api/.env`, set a unique `AUTH_JWT_SECRET` of at least 32 bytes.
Generate one locally with
`python -c "import secrets; print(secrets.token_urlsafe(48))"`.
For an initial setup without private provider credentials, also set:

```dotenv
CHAT_PROVIDER=mock
CHAT_MODEL=TBD
AVATAR_PROVIDER=mock
AVATAR_MODEL=TBD
```

Mock mode supports local development and CI; it does **not** provide real Coach
or Avatar generation. Real InBody OCR needs a server-side `MISTRAL_API_KEY`.
See [provider configuration](docs/providers/CONFIGURATION.md) before enabling
live providers. Never put backend keys in `apps/mobile/.env` or any
`EXPO_PUBLIC_*` variable.

Start the database and apply migrations:

```powershell
docker compose -f infra/compose.yaml up -d postgres
python -m alembic -c apps/api/alembic.ini upgrade head
```

Start the API and Expo in separate terminals, with the virtual environment activated in the API terminal:

```powershell
python -m uvicorn app.main:app --reload --app-dir apps/api
```

```powershell
npm run mobile:dev
```

Check `http://127.0.0.1:8000/health` for the API. Expo prints launch options
and a QR code for the mobile app.

### Test on a phone or emulator

`apps/mobile/.env.example` uses `http://127.0.0.1:8000`, which is not a
reachable API address from a separate device. For an Android emulator, set
`EXPO_PUBLIC_API_URL=http://10.0.2.2:8000` in `apps/mobile/.env`.

For a physical phone, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` and
`API_PUBLIC_URL` in `apps/api/.env` to `http://<computer-LAN-IPv4>:8000`.
Run Uvicorn with `--host 0.0.0.0`. Keep the phone and computer on the same
trusted network, allow port 8000 only on that network, and restart Expo after
changing its environment file. A phone cannot reach your computer through
`127.0.0.1`.

The [team device guide](docs/release/team-device-installation.md) has the
complete pre-hosting Expo Go and staging-build instructions. An Expo build or
QR code does not host the API or database.

## Quality checks

```powershell
npm run mobile:lint
npm run mobile:routes
npm run mobile:typecheck
npm run mobile:test
python -m ruff check --config apps/api/pyproject.toml apps/api/app tests deployment
python -m pytest -c apps/api/pyproject.toml
```

GitHub CI also exports Android, iOS, and web bundles, checks migrations against
PostgreSQL, and builds the API container. Live provider tests are opt-in and
need explicitly authorized credentials and private fixtures; a skipped live
test is not a live-service pass.

## Work together safely

Create feature branches from the latest `main` and open PRs back to `main`.
The branch requires a PR plus passing mobile, API, and container checks;
force-pushes to `main` are blocked. Follow [CONTRIBUTING.md](CONTRIBUTING.md)
for ownership, validation, and issue-reporting rules.

This is a public repository. Do not commit `.env` files, tokens, body reports,
source photos, generated avatars, or unredacted provider responses. InBody
values must be reviewed by the user before confirmation, and Avatar publication
is a separate explicit choice.

## Further reading

- [Provider configuration](docs/providers/CONFIGURATION.md) and [decisions](docs/providers/DECISIONS.md)
- [Architecture and workstream integration](docs/workstreams/01-core/INTEGRATION.md)
- [Team device testing](docs/release/team-device-installation.md)
- [Release checklist](docs/release/checklist.md)
