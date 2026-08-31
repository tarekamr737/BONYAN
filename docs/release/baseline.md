# Workstream 06 Baseline Verification

Date: 2026-08-31  
Branch: `feat/06-release-hardening`  
Starting `main` SHA: `2d1736b8cba7ce31e7e3f7ea8fc136e556e23d5f`

## Verified Locally

| Check | Result | Evidence |
| --- | --- | --- |
| Mobile lint | PASS | ESLint completed with zero warnings. |
| Expo route generation | PASS | Typed route generation completed. |
| Mobile typecheck | PASS | `tsc --noEmit` completed. |
| Mobile tests | PASS | 6 files, 16 tests. |
| Expo web export | PASS | 19 static routes exported. |

The local host has Node 22.12.0 while CI uses Node 24. Dependency installation warned that
some packages require Node 22.13 or newer; the checks above nevertheless completed. CI remains
the authoritative Node 24 result.

## Environment-Blocked Checks

| Check | Status | Required environment |
| --- | --- | --- |
| API lint/tests | BLOCKED | Python 3.12–3.14 is not installed on this host. |
| Alembic clean upgrade | BLOCKED | Python 3.12–3.14 and PostgreSQL are unavailable. |
| Containerized PostgreSQL | BLOCKED | Docker is not installed on this host. |
| Android native QA | NOT RUN | Emulator or physical device and release build are required. |
| iOS native QA | BLOCKED | Native simulator/device environment unavailable on this Windows host. |

No blocked check is reported as passing.

