# Provider Configuration

Normal development and CI keep both undecided providers mocked:

```dotenv
CHAT_PROVIDER=mock
CHAT_MODEL=gpt-5.6-terra
AVATAR_PROVIDER=mock
AVATAR_MODEL=gemini-3.1-flash-image
```

Staging production adapters require backend-only secrets:

```dotenv
CHAT_PROVIDER=openai
CHAT_MODEL=gpt-5.6-terra
CHAT_API_KEY=
CHAT_TIMEOUT_SECONDS=20
AVATAR_PROVIDER=gemini
AVATAR_MODEL=gemini-3.1-flash-image
AVATAR_API_KEY=
AVATAR_TIMEOUT_SECONDS=45
MISTRAL_API_KEY=
MUSCLEWIKI_API_KEY=
```

Settings validation fails at startup when a production provider is selected without its key. The Coach adapter never stores responses and exposes only normalized text, validated tool calls, token counts, and estimated cost. The Avatar adapter receives source bytes in memory, sends a shape category instead of exact body measurements, and returns normalized private image bytes. MuscleWiki keys are sent upstream as `X-API-Key` and never appear in mobile URLs.

Run Alembic revision `20260904_0007` before enabling source-photo uploads. Source photos and generated avatars use private object storage. Uploading, generation, approval, and community publication remain separate actions.
