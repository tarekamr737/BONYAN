# Workstream 05 Integration Handoff

Person 01 must:

1. Apply Alembic revision `20260904_0007` in staging.
2. Configure backend-only provider variables from `CONFIGURATION.md`; do not place keys in Expo variables.
3. Use production provider selectors only in staging until the live score gates pass.
4. Wire the existing Avatar flow to upload the consented private image with
   `POST /api/v1/avatars/source-photos`, pass the returned `source_photo_id` to
   `POST /api/v1/avatars`, and offer source-photo deletion without coupling approval
   to community publication.
5. Provide a disposable staging user/token and private consented fixture manifests for the full flow.
6. Review benchmark JUnit properties and complete the human language/identity score sheets before promotion.

The integration preserves `MockLLMProvider` and `MockAvatarProvider` for normal CI. Domain code imports provider-neutral contracts only. Coach tool calls are server-declared, provider-returned, Pydantic-validated, and capped at one round/four calls. Avatar source photos, generated results, approval, and publication remain separate; no source key or body measurement is serialized to clients.
