# Live Provider Validation

Live tests are opt-in and do not run during normal CI. Keep manifests and result artifacts outside
Git and never print provider keys, prompts, source photos, reports, or generated image bytes.

```powershell
$env:CHAT_PROVIDER = "sovereigneg"
$env:CHAT_MODEL = "glm-5.3-flash"
$env:CHAT_API_KEY = "..."
$env:BONYAN_LIVE_COACH_TIMEOUT_SECONDS = "120"
$env:AVATAR_PROVIDER = "cloudflare"
$env:AVATAR_MODEL = "@cf/black-forest-labs/flux-2-klein-4b"
$env:CLOUDFLARE_ACCOUNT_ID = "..."
$env:CLOUDFLARE_API_TOKEN = "..."
$env:MISTRAL_API_KEY = "..."
$env:BONYAN_RUN_EXERCISEDB_LIVE = "1"
$env:BONYAN_LIVE_AVATAR_MANIFEST = "D:\BONYAN-private\manifests\avatar-live.json"
$env:BONYAN_LIVE_OCR_MANIFEST = "D:\BONYAN-private\manifests\ocr-live.json"
npm run api:test:live
```

Avatar tests require `consent_confirmed: true`. ExerciseDB needs no credential. The destructive
full-flow test additionally requires `BONYAN_RUN_FULL_STAGING=1`, an HTTPS staging URL, and a
disposable staging token; it removes created artifacts in `finally` cleanup.

Current result (2026-09-11): ExerciseDB search, filtered retrieval, detail, and sanitized GIF media
passed live after an initial transient public-service failure. The retired OpenRouter Nemotron
candidate passed 3/7 cases in 430.22 seconds. It passed
the current-plan tool call, hallucination-resistance tool call, and medical-boundary case; two Arabic
answer cases selected tools unexpectedly, one MSA response was incomplete, and exercise search hit
a bounded upstream-unavailable response. The same beginner case passed alone in 51.62 seconds,
confirming intermittent behavior but not release-grade reliability. SovereignEG authentication and
the live model catalog pass for `glm-5.3-flash`. Its first seven-case Coach run passed 5/7 in 65.82
seconds: Egyptian beginner, MSA, current-plan, exercise-search, and medical-boundary cases passed;
the mixed-language case chose an unnecessary current-plan tool and the unknown squat-weight case
chose current plan instead of training history. Repeated scoring and human Arabic review remain
pending.

Cloudflare credentials and the repository's synthetic Avatar fixture passed the live source-image
request, response decoding, and model-execution check in 9.53 seconds. The intended private identity
fixture path was absent, so identity preservation, realism, and regeneration scoring remain gated.
Mistral connectivity passed previously, while the representative private OCR fixture suite and full
staging flow remain gated. Never treat these connectivity checks as human quality approval.
