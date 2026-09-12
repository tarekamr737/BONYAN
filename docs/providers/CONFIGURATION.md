# Provider Configuration

The intended release configuration is:

```dotenv
CHAT_PROVIDER=sovereigneg
CHAT_MODEL=glm-5.3-flash
CHAT_API_KEY=
EXERCISE_PROVIDER=exercisedb
EXERCISEDB_BASE_URL=https://oss.exercisedb.dev/api/v1
AVATAR_PROVIDER=openrouter
AVATAR_MODEL=meta/muse-image
OPENROUTER_AVATAR_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
MISTRAL_API_KEY=
```

Secrets belong only in the backend runtime environment. Settings fail closed when a selected Coach
or Avatar provider lacks credentials or an explicit model. The ExerciseDB endpoint is restricted to
the official HTTPS V1 host and its returned media is restricted to the official static media host.

Normal offline development and CI may explicitly use `CHAT_PROVIDER=mock` and
`AVATAR_PROVIDER=mock`. Legacy Cloudflare, Gemini, Puter, and MuscleWiki adapters remain
opt-in only; there is no automatic provider or paid-model failover. Restart the API after
configuration changes.

OpenRouter Avatar requests use the dedicated `https://openrouter.ai/api/v1/images` endpoint with a
private base64 reference image. Only `meta/muse-image` and `qwen/qwen-image-3` are accepted by the
release adapter. Keep `OPENROUTER_AVATAR_API_KEY` backend-only; the older mixed-case local spelling
is supported by the live harness temporarily but must not be copied into deployment configuration.
Muse is the selected candidate. Qwen required a timeout above 45 seconds in live testing and is not
an automatic fallback.

SovereignEG uses the OpenAI-compatible endpoint
`https://backend.sovereigneg.com/v1/chat/completions`. Verify model IDs against authenticated
`GET /v1/models`; `glm-5.3-flash` was present and healthy when locked on 2026-09-11. Standard
requests may be routed to external model providers. Arrange an Egypt-hosted deployment separately
if data residency is required.

Run Alembic revision `20260904_0007` before enabling source-photo uploads. Source photos and generated
avatars use private storage; upload, generation, approval, and Community publication are separate
actions.

## Cloudflare Workers AI setup

Cloudflare FLUX is retained as a historical/rollback adapter, not the selected Avatar provider. Its
private identity benchmark failed at 2.75/5.

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
   consented JPEG/PNG/WebP source photo, set a private `output_directory`, and set
   `consent_confirmed` to `true`.
8. Set `BONYAN_LIVE_AVATAR_MANIFEST` to that private manifest path and run
   `npm run api:test:live -- -k avatar_candidate_live`.
9. Review the timestamped generated image in the private output directory for identity/skin-tone/age
   preservation, anatomy, prompt adherence, latency, and quota. Delete private review artifacts
   after the approved retention period.
10. Store the two Cloudflare values in the staging/production backend secret manager. Rotate the
    token after suspected exposure and monitor daily neuron usage in the Workers AI dashboard.

The direct REST adapter does not require an AI Gateway or deployed Worker. Do not enable paid-plan
fallback or add payment details solely to bypass the 10,000-neuron daily free allowance.
