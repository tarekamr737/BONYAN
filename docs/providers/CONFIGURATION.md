# Provider Configuration

Normal development and CI keep both undecided providers mocked:

```dotenv
CHAT_PROVIDER=mock
CHAT_MODEL=TBD
AVATAR_PROVIDER=mock
AVATAR_MODEL=TBD
```

Live benchmarks and staging production adapters require backend-only secrets and
an explicit candidate model override:

```dotenv
CHAT_PROVIDER=openai
CHAT_MODEL=<candidate from docs/benchmarks/coach-candidates.json>
CHAT_API_KEY=
CHAT_TIMEOUT_SECONDS=20
AVATAR_PROVIDER=gemini
AVATAR_MODEL=<candidate from docs/benchmarks/avatar-candidates.json>
AVATAR_API_KEY=
AVATAR_TIMEOUT_SECONDS=45
MISTRAL_API_KEY=
MUSCLEWIKI_API_KEY=
```

Settings validation fails at startup when a production provider is selected
without its key or with `CHAT_MODEL`/`AVATAR_MODEL` still set to `TBD`. The Coach
adapter never stores responses and exposes only normalized text, validated tool
calls, token counts, and estimated cost. The Avatar adapter receives source bytes
in memory, sends a shape category instead of exact body measurements, and returns
normalized private image bytes. MuscleWiki keys are sent upstream as `X-API-Key`
and never appear in mobile URLs.

Run Alembic revision `20260904_0007` before enabling source-photo uploads. Source photos and generated avatars use private object storage. Uploading, generation, approval, and community publication remain separate actions.
