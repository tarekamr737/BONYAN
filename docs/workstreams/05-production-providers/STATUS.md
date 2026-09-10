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
- Backend validation after rebasing onto WS6: Ruff clean; 184 offline tests passed; 27 live cases skipped only
  for their documented environment gates.
- Repository validation: mobile lint, routes, typecheck, 27 tests, and the 19-route
  Expo Android/iOS/web release export passed. Alembic has one head, rendered cleanly,
  upgraded a fresh PostgreSQL 17 database, passed `alembic check`, downgraded to 0006,
  and upgraded to `20260904_0007` again.
- WS6 rate limiting, safe logging, upload hardening, release environment validation, and
  account deletion behavior were preserved. Account deletion now includes Avatar source-photo
  records and private objects.

## Blocked Externally

- Coach candidate quality/tool benchmark: the locally configured OpenRouter candidate returned
  HTTP 404 in all seven attempted cases; its model availability/configuration and human Arabic
  scoring remain open.
- Avatar candidate identity/realism benchmark: missing Gemini key and consented private fixtures.
- Mistral six-format validation: missing Mistral key and private InBody fixtures/ground truth.
- MuscleWiki live search/media validation: the local credential returned HTTP 403 and needs valid
  access or the required subscription tier.
- Full staging flow: missing deployed staging URL, disposable user token, all provider keys, and private fixture manifests.

The balanced shortlist candidates are `gpt-5.6-terra` and
`gemini-3.1-flash-image`. They are not final production selections and must not
be promoted until the live gates above pass.
