# Live Provider Validation

Live tests are opt-in and never run provider calls during normal CI.

```powershell
$env:CHAT_API_KEY = "..."
$env:AVATAR_API_KEY = "..."
$env:MISTRAL_API_KEY = "..."
$env:MUSCLEWIKI_API_KEY = "..."
$env:BONYAN_LIVE_AVATAR_MANIFEST = "C:\private\avatar-manifest.json"
$env:BONYAN_LIVE_OCR_MANIFEST = "C:\private\ocr-manifest.json"
npm run api:test:live -- --junitxml=.live-results/providers.xml
```

Use the example manifests under `docs/benchmarks/` as schemas, but keep real manifests, reports, source photos, generated images, and JUnit output outside Git. Avatar tests require `consent_confirmed: true`. The tests record only model IDs, latency, token counts, cost estimates, and pass/fail metrics; they do not print prompts or image/report content.

For the destructive staging flow, use a disposable authenticated staging user and explicitly enable it:

```powershell
$env:BONYAN_RUN_FULL_STAGING = "1"
$env:BONYAN_STAGING_BASE_URL = "https://staging-api.example"
$env:BONYAN_STAGING_TOKEN = "..."
npm run api:test:live -- -k full_provider_staging_flow
```

The staging test uploads and confirms an InBody report, generates a deterministic Training plan through MuscleWiki, invokes the real Coach, uploads a private source photo, generates an Avatar, verifies approval is not publication, explicitly publishes it for community use, and removes created artifacts in `finally` cleanup.

Current result on 2026-09-04: all 27 live cases collect and skip safely. Live execution is blocked because no provider keys, consented Avatar fixture, InBody fixture manifest, staging URL, or staging token are present.
