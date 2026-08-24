# Parallel workstream integration contract

The baseline keeps shared wiring deliberately small. Feature branches add code only
inside their owned paths and expose typed routers/screens for Workstream 01 to register
after merge.

## Ownership

| Workstream | Mobile | API | Tests |
| --- | --- | --- | --- |
| 02 InBody | `src/features/inbody/**` | `domains/inbody/**`, `integrations/mistral/**` | `tests/inbody/**` |
| 03 Training | `src/features/training/**` | `domains/training/**`, `integrations/musclewiki/**`, `integrations/llm/**` | `tests/training/**` |
| 04 Community | `src/features/avatar/**`, `src/features/community/**` | `domains/avatar/**`, `domains/community/**`, `integrations/avatar/**` | `tests/community/**` |

Paths under `apps/mobile` and `apps/api/app` are abbreviated in the table.

## Backend modules

Use only the files the domain needs. The conventional dependency direction is:

```text
router.py -> service.py -> repository.py -> SQLAlchemy
                  |
                  +-> provider contract -> integration adapter
```

Request and response types live in `schemas.py`; persistence mappings live in
`models.py`. A feature package exports one FastAPI `APIRouter`. Workstream 01 performs
the final `include_router(...)` call in `apps/api/app/core/routing.py`. All product API
routes are versioned below `/api/v1`.

## Mobile modules

Keep feature screens and their supporting code under `src/features/<feature>`. Export
route-level screens from the feature; Workstream 01 adds the corresponding file-based
route adapter under `apps/mobile/app` after merge. Shared server state uses the existing
TanStack Query provider and API client.

## Shared provider contracts

`LLMProvider` and `AvatarProvider` live in `apps/api/app/core/providers`. Workstream
adapters implement those protocols without leaking provider SDK types into services.
The deterministic mocks require no credentials and remain the default until model and
provider decisions are explicitly made.

## Merge handoff

Each feature PR must list its exported router and screen components. It must not edit
the central routing files. After merge, Workstream 01 adds only the necessary imports,
router registrations, and Expo route adapters, then runs the full baseline checks.
