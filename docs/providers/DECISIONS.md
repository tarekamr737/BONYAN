# Final Production Provider Decisions

Status as of 2026-09-11: provider choices are locked for this release candidate.

| Capability | Active provider/model | Why selected | Release risk |
|---|---|---|---|
| Exercises | ExerciseDB V1 Free API | Normalized exercise metadata and hosted GIFs without an API key | Public free service availability and rate limits are not guaranteed |
| Coach | SovereignEG / `glm-5.3-flash` | OpenAI-compatible endpoint, live authenticated catalog entry, three healthy routed backends, tool support, and EGP billing | Standard routing is not Egypt data residency; live BONYAN language/tool scoring is pending and usage is paid |
| Avatar | Cloudflare Workers AI / `@cf/black-forest-labs/flux-2-klein-4b` | Image-to-image input and low per-image unit cost behind the existing private lifecycle | Credentials, consented-fixture quality, and quota must be validated live |
| OCR | Mistral / `mistral-ocr-4-1` | Existing validated OCR boundary and locked production model | Representative private-fixture accuracy remains a release gate |

Training and Avatar domains remain provider-neutral. OpenRouter, MuscleWiki, and Gemini stay as
explicit legacy adapters, but production never silently falls back to them. During upstream outages BONYAN returns
cached exercise metadata when present or a safe unavailable state; it never incurs an unapproved
paid-model charge.

All credentials remain backend-only. ExerciseDB accepts no secret. Exercise media URLs are accepted
only from `https://static.exercisedb.dev/media/`; source photos and generated avatars retain the
private upload, preview, explicit approval, and explicit publication lifecycle.

Sources: https://docs.ascendapi.com/products/edb-v1/overview,
https://sovereigneg.com/docs,
https://sovereigneg.com/docs/function-calling,
https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/,
and https://docs.mistral.ai/models/ocr-4-1.
