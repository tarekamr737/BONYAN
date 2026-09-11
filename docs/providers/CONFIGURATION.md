# Provider Configuration

The intended release configuration is:

```dotenv
CHAT_PROVIDER=openrouter
CHAT_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
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

## Cloudflare Workers AI setup

1. Sign in at https://dash.cloudflare.com and select the account that will own BONYAN usage.
2. Open **AI > Workers AI**, select **Use REST API**, then select
   **Create a Workers AI API Token**.
3. Keep the prefilled account scope limited to the selected BONYAN account. A custom token requires
   both **Workers AI - Read** and **Workers AI - Edit** permissions. Do not grant zone, DNS, Worker
   deployment, or billing permissions to the inference token.
4. Create the token and copy it immediately into the ignored backend `.env` as
   `CLOUDFLARE_API_TOKEN`. Never put it in an `EXPO_PUBLIC_*` variable, mobile config, Git, screenshots,
   chat, or CI logs.
5. Copy the **Account ID** shown in the same REST API panel into
   `CLOUDFLARE_ACCOUNT_ID`.
6. Set `AVATAR_PROVIDER=cloudflare` and
   `AVATAR_MODEL=@cf/black-forest-labs/flux-2-klein-4b` in the backend environment.
7. Copy `docs/benchmarks/avatar-live-manifest.example.json` outside the repository, point it at a
   consented JPEG/PNG/WebP source photo, and set `consent_confirmed` to `true`.
8. Set `BONYAN_LIVE_AVATAR_MANIFEST` to that private manifest path and run
   `npm run api:test:live -- -k avatar_candidate_live`.
9. Confirm the generated image, identity/skin-tone/age preservation, anatomy, latency, and quota in
   the private review workflow. Delete the fixture and generated test object after validation.
10. Store the two Cloudflare values in the staging/production backend secret manager. Rotate the
    token after suspected exposure and monitor daily neuron usage in the Workers AI dashboard.

The direct REST adapter does not require an AI Gateway or deployed Worker. Do not enable paid-plan
fallback or add payment details solely to bypass the 10,000-neuron daily free allowance.
