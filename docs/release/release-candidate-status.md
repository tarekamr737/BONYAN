# BONYAN Release Candidate Status

Date: 2026-09-10
Branch: `feat/release-candidate`
Starting main SHA: `2b379fa568479505583b25eba4e3e94e1af8cce9`

## Verdict

**BLOCKED.** The merged codebase passes normal CI-equivalent validation, but release sign-off
requires live provider evidence, deployed staging E2E, staging backup/restore, and native QA.

## Verified

- Ruff passed; 184 backend tests passed and 27 explicitly gated live cases skipped normally.
- Release/security (10), provider (31), Training (42), and Avatar/Community (41) focused tests pass.
- Mobile lint, route generation, typecheck, 27 tests, and Android/iOS/web Expo export pass.
  Export used a non-secret HTTPS placeholder solely to exercise bundling; no staging deployment is
  claimed.
- PostgreSQL 17 upgraded to the single Alembic head `20260904_0007`; `alembic check`, downgrade to
  `20260830_0006`, and re-upgrade passed.
- A local isolated backup/restore rehearsal preserved revision `20260904_0007` and a disposable
  account; the API started against the restored database, `/ready` returned 200, and login worked.
- Current `main` GitHub Baseline CI and Release Images runs passed.
- Root `.env` is ignored and untracked; tracked-secret tests pass. Local provider selection was
  returned to mocks because no live candidate passed the release threshold.

## Provider evidence

- Mistral OCR remains locked to `mistral-ocr-4-1`; its six-case private fixture manifest is absent.
- MuscleWiki live access still returns HTTP 403, consistent with an invalid key or insufficient tier.
- OpenRouter `minimax/minimax-m3:free` is not a valid current endpoint. The available MiniMax model
  does not support required tools. `openai/gpt-oss-120b` reached the API but passed only 3 of 7
  automated Coach cases and is not selected.
- Avatar remains on the mock provider; the provider key and consented private fixture manifest are
  absent. No Avatar model is selected.

## Blocking release gates

- Deploy approved HTTPS staging with isolated PostgreSQL, persistent private storage, and secrets.
- Pass the disposable-account staging E2E and provider failure/degraded-mode checks.
- Pass live Coach, Avatar, Mistral, and MuscleWiki validation and complete required human scoring.
- Rehearse backup/restore using an actual staging restore point; the local rehearsal is not a
  substitute for staging evidence.
- Install and test a signed Android build on a named device/emulator. This host has no Android SDK,
  ADB, Java, emulator, or EAS tooling.
- Decide whether iOS is in the first release scope; if it is, obtain simulator/device evidence.
- Configure a protected production GitHub environment with an independent required reviewer. The
  repository currently has only an unprotected staging environment and no production environment.
- Replace provisional cost estimates only after final providers and staging measurements exist.
