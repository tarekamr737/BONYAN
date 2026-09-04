# Workstream 05 Status

## Complete Offline

- Latest `main` baseline recorded and feature branch created.
- Existing Mistral, MuscleWiki, Coach mock, and Avatar mock tests verified.
- Reproducible Coach and Avatar candidate sets, test sets, rubrics, and cost model added.
- `ProductionLLMProvider` and `ProductionAvatarProvider` implemented with configurable models and backend-only credentials.
- Timeout, bounded retry, auth, rate-limit, malformed-output, secret-redaction, typed-tool, and Avatar privacy behavior covered by unit tests.
- Mistral OCR and MuscleWiki clients aligned with current locked-provider documentation.
- Opt-in live and full-staging suites added; normal CI skips them without credentials.
- Integration handoff documented.
- Backend validation: Ruff clean; 140 offline tests passed; 27 live cases skipped only
  for their documented environment gates.
- Repository validation: mobile lint, routes, typecheck, 16 tests, and the 19-route
  Expo web export passed; Alembic rendered cleanly through `20260904_0007`; Uvicorn
  returned `200 {"status":"ok"}` from `/health`.

## Blocked Externally

- Coach candidate quality/tool benchmark: missing OpenAI key and human Arabic scoring.
- Avatar candidate identity/realism benchmark: missing Gemini key and consented private fixtures.
- Mistral six-format validation: missing Mistral key and private InBody fixtures/ground truth.
- MuscleWiki live search/media validation: missing paid-tier API key.
- Full staging flow: missing deployed staging URL, disposable user token, all provider keys, and private fixture manifests.

The provisional selections are `gpt-5.6-terra` and `gemini-3.1-flash-image`. They are implemented but must not be called evidence-final until the live gates above pass.
