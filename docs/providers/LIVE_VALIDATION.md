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
request, response decoding, and model-execution check in 9.53 seconds. Two consented private source
images were then run three times each. All six calls returned valid safe images, with 9.49-second p50
and 35.19-second p95 latency and $0.002076 total estimated cost. Human review scored identity 2/5,
facial consistency 2/5, realism 3/5, prompt adherence 4/5, regeneration consistency 2/5,
privacy/safety fit 5/5, and latency/cost 4/5, for 2.75/5 weighted. Recognizable identity was not
preserved reliably and facial hair/style drifted across regenerations, so the candidate fails the
Avatar release-quality gate. Private sources, outputs, and JUnit evidence remain outside Git.
Mistral passed the private nine-case fixture run in 4.59 seconds after the parser was hardened for
Markdown tables, compact key/value output, historical measurement rows, and derived BMI review
metadata. Six cases carry machine-readable accuracy expectations; the three hardest multipart
images currently validate extraction robustness only and still need ground-truth labels.

The disposable-user full staging flow passed through a temporary Cloudflare Quick Tunnel in 22.42
seconds: HTTPS health, authenticated OCR upload and confirmation, plan creation, live Coach,
private Avatar generation, approval, explicit Community publication, cleanup, and account deletion.
The first attempt found a PostgreSQL-only expired-timestamp serialization defect; explicit refresh
after InBody mutations fixed it. This Quick Tunnel has no uptime guarantee and is suitable only for
the current QA cycle. Never treat connectivity checks as human quality approval.
