# Final Provider Cost Estimate

Estimate date: 2026-09-11. Free tiers and public endpoints are capacity-limited offers, not permanent
availability guarantees.

| Capability | Expected provider cost | Constraint |
|---|---:|---|
| ExerciseDB V1 | $0 | Published free-plan guidance is 1,000 API requests/hour; CDN media is generally unlimited |
| Gemma Coach via OpenRouter | $0 while the `:free` route is available | Provider-dependent capacity and limits; never auto-switch to paid |
| FLUX.2 Klein 4B Avatar | about $0.000346 for one 512-tile reference plus one 512-tile output after allowance | 31.42 neurons or $0.000059/input tile + $0.000287/output tile |
| Mistral OCR 4.1 | $0.004 per one-page report | $4 per 1,000 pages |

Cloudflare documents 10,000 free neurons per day. At 5.37 neurons for one input tile plus 26.05 for
one output tile, BONYAN's 512-by-512 request is approximately 318 generations/day if no other Workers
AI calls consume that account's allowance. This is a mathematical ceiling, not guaranteed capacity;
retries and provider accounting can reduce it. Usage above the allowance on Workers Paid is billed at
$0.011 per 1,000 neurons.

Sources: https://docs.ascendapi.com/products/edb-v1/overview,
https://openrouter.ai/google/gemma-4-31b-it:free/apps,
https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/,
https://developers.cloudflare.com/workers-ai/platform/pricing/, and
https://docs.mistral.ai/models/ocr-4-1.
