# Contributing to BONYAN

`main` is the shared development baseline. Use a short-lived branch for each change;
do not push directly to `main` or work from another contributor's feature branch.
This repository is public, so never commit `.env` files, credentials, private body
reports, source photos, or generated avatars.

## Start from the current baseline

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feat/<short-description>
```

Install and run the app using [README.md](README.md). Local mock providers let you
develop without access to the owner's production credentials. A local API and
database are still required for connected flows; Expo Go does not host the API.
For a team device build, follow
[the installation guide](docs/release/team-device-installation.md) and check its
staging API URL before testing. The documented Quick Tunnel is temporary, so an
old build link does not guarantee a reachable backend.

## Keep changes independent

- Agree on an owner for shared routing, configuration, migrations, and lockfiles
  before changing them. Feature modules should stay in their domain directories.
- Open one PR per cohesive change against `main`. Describe the user-visible change,
  test evidence, migration or environment changes, and any private-data impact.
- Before merging, fetch `main`, integrate its latest changes into your branch,
  resolve conflicts there, and rerun the checks below. Never force-push `main`.
- Merge only when the `mobile`, `api`, and `release-container` CI jobs pass. If a
  check is skipped or a live provider was not exercised, say so in the PR.
- Use a new branch for follow-up fixes. Do not continue work on a merged branch.

```powershell
npm ci
npm run mobile:lint
npm run mobile:routes
npm run mobile:typecheck
npm run mobile:test
python -m ruff check --config apps/api/pyproject.toml apps/api/app tests deployment
python -m pytest -c apps/api/pyproject.toml
```

CI additionally exports the mobile bundle, builds the API container, and checks
PostgreSQL migrations. For changes to OCR, Coach, or Avatar providers, use
consented private fixtures and keep outputs outside Git. Review extracted InBody
values before confirming them; never treat OCR as ground truth.

## Report issues

Include the commit or build ID, device and OS, language, reproduction steps,
expected/actual behavior, and relevant redacted logs. Do not attach private
reports, body photos, access tokens, or unredacted provider responses to public
GitHub issues.
