# Live Provider Validation

Live tests are opt-in and never run provider calls during normal CI.

```powershell
$env:CHAT_PROVIDER = "openai" # Use "puter" for the Puter gateway.
$env:CHAT_API_KEY = "..."
$env:AVATAR_API_KEY = "..."
$env:MISTRAL_API_KEY = "..."
$env:MUSCLEWIKI_API_KEY = "..."
$env:BONYAN_LIVE_AVATAR_MANIFEST = "C:\private\avatar-manifest.json"
$env:BONYAN_LIVE_OCR_MANIFEST = "C:\private\ocr-manifest.json"
npm run api:test:live -- --junitxml=.live-results/providers.xml
```

For Puter Coach only, set `CHAT_PROVIDER=puter`, `CHAT_MODEL=gpt-4.1`, and
`CHAT_API_KEY` to your Puter auth token in the process environment, then run
`npm run api:test:live -- -k coach`. The live runner reads these process variables,
not the backend `.env`. Puter tests use the configured model; direct OpenAI tests
use the benchmark shortlist. Missing provider selection skips Coach calls.

Use the example manifests under `docs/benchmarks/` as schemas, but keep real manifests, reports, source photos, generated images, and JUnit output outside Git. Avatar tests require `consent_confirmed: true`. The tests record only model IDs, latency, token counts, cost estimates, and pass/fail metrics; they do not print prompts or image/report content.

For the destructive staging flow, use a disposable authenticated staging user and explicitly enable it:

```powershell
$env:BONYAN_RUN_FULL_STAGING = "1"
$env:BONYAN_STAGING_BASE_URL = "https://staging-api.example"
$env:BONYAN_STAGING_TOKEN = "..."
npm run api:test:live -- -k full_provider_staging_flow
```

The staging test uploads and confirms an InBody report, generates a deterministic Training plan through MuscleWiki, invokes the real Coach, uploads a private source photo, generates an Avatar, verifies approval is not publication, explicitly publishes it for community use, and removes created artifacts in `finally` cleanup.

Current integration result on 2026-09-10:

- The seven Coach cases were attempted through the locally configured OpenRouter candidate. The
  configured `minimax/minimax-m3:free` slug returned HTTP 404 with both supplied keys. The current
  paid MiniMax endpoint does not support the required tool parameter. A current tool-capable paid candidate,
  `openai/gpt-oss-120b`, passed 3 of 7 automated cases; its withdrawn free variant returned HTTP
  404. The paid candidate failed two output-completion cases and two tool-choice cases, so it is
  not eligible and no Coach model is selected. Human Arabic scoring was not promoted from this
  failed run.
- MuscleWiki live search was attempted with the updated local backend credential. The provider
  returned HTTP 403 and explicitly identified the key as BASIC tier, which is restricted to the
  playground. Direct API validation requires TESTING tier or higher.
- Mistral authentication and model connectivity passed using a synthetic blank PDF and a
  repository-owned image. The representative six-case accuracy benchmark remains gated by the
  private fixture manifest.
- The Gemini key and `gemini-3.1-flash-image` reached the live API after removing the obsolete
  `delivery` request field. Google then returned HTTP 429 because the key has zero free-tier quota
  for this model. No image was generated, and the consented private fixture benchmark remains
  gated. Local Avatar configuration therefore remains on the mock adapter.
- Full staging remains gated by a deployed staging URL, disposable user token, provider access,
  and both private fixture manifests.

No secret values, prompts, photos, reports, or provider response bodies were recorded.
