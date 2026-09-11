# Provider Configuration

The intended release configuration is:

```dotenv
CHAT_PROVIDER=openrouter
CHAT_MODEL=google/gemma-4-31b-it:free
CHAT_API_KEY=
EXERCISE_PROVIDER=exercisedb
EXERCISEDB_BASE_URL=https://oss.exercisedb.dev/api/v1
AVATAR_PROVIDER=cloudflare
AVATAR_MODEL=@cf/black-forest-labs/flux-2-klein-4b
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
MISTRAL_API_KEY=
```

Secrets belong only in the backend runtime environment. Settings fail closed when a selected Coach
or Avatar provider lacks credentials or an explicit model. The ExerciseDB endpoint is restricted to
the official HTTPS V1 host and its returned media is restricted to the official static media host.

Normal offline development and CI may explicitly use `CHAT_PROVIDER=mock` and
`AVATAR_PROVIDER=mock`. Legacy `gemini`, `puter`, and `musclewiki` adapters remain opt-in only; there
is no automatic provider or paid-model failover. Restart the API after configuration changes.

Run Alembic revision `20260904_0007` before enabling source-photo uploads. Source photos and generated
avatars use private storage; upload, generation, approval, and Community publication are separate
actions.
