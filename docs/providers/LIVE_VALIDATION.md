# Live Provider Validation

Live tests are opt-in and do not run during normal CI. Keep manifests and result artifacts outside
Git and never print provider keys, prompts, source photos, reports, or generated image bytes.

```powershell
$env:CHAT_PROVIDER = "openrouter"
$env:CHAT_MODEL = "google/gemma-4-31b-it:free"
$env:CHAT_API_KEY = "..."
$env:AVATAR_PROVIDER = "cloudflare"
$env:AVATAR_MODEL = "@cf/black-forest-labs/flux-2-klein-4b"
$env:CLOUDFLARE_ACCOUNT_ID = "..."
$env:CLOUDFLARE_API_TOKEN = "..."
$env:MISTRAL_API_KEY = "..."
$env:BONYAN_RUN_EXERCISEDB_LIVE = "1"
$env:BONYAN_LIVE_AVATAR_MANIFEST = "C:\private\avatar-manifest.json"
$env:BONYAN_LIVE_OCR_MANIFEST = "C:\private\ocr-manifest.json"
npm run api:test:live
```

Avatar tests require `consent_confirmed: true`. ExerciseDB needs no credential. The destructive
full-flow test additionally requires `BONYAN_RUN_FULL_STAGING=1`, an HTTPS staging URL, and a
disposable staging token; it removes created artifacts in `finally` cleanup.

Current result (2026-09-11): ExerciseDB search, filtered retrieval, detail, and sanitized GIF media
passed live after an initial transient public-service failure. The configured OpenRouter key reached
the endpoint but received HTTP 401, so Gemma text/tool behavior is not validated. Cloudflare account
ID/token and the consented Avatar fixture manifest are absent, so source-image generation and quality
scoring are blocked. Mistral connectivity passed previously, while the representative private OCR
fixture suite and full staging flow remain gated.
