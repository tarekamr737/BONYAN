# Final Provider Cost Estimate

Estimate date: 2026-09-12. Free tiers and public endpoints are capacity-limited offers, not permanent
availability guarantees.

| Capability | Expected provider cost | Constraint |
|---|---:|---|
| ExerciseDB V1 | $0 | Published free-plan guidance is 1,000 API requests/hour; CDN media is generally unlimited |
| GLM 5.3 Flash Coach via SovereignEG | 8.4478 EGP input / 28.1592 EGP output per 1M tokens | Metered usage draws from the organization's EGP credit balance; no automatic fallback is allowed |
| Muse Image Avatar via OpenRouter | $0.01 observed per reference generation | Six benchmark generations billed $0.06 total; pricing/catalog availability can change |
| Qwen Image 3 via OpenRouter | $0.033 observed per reference generation | $0.003 input image plus $0.03 output image; six benchmark generations billed $0.198 total |
| Mistral OCR 4.1 | $0.004 per one-page report | $4 per 1,000 pages |

Cloudflare documents 10,000 free neurons per day. At 5.37 neurons for one input tile plus 26.05 for
one output tile, BONYAN's 512-by-512 request is approximately 318 generations/day if no other Workers
AI calls consume that account's allowance. This is a mathematical ceiling, not guaranteed capacity;
retries and provider accounting can reduce it. Usage above the allowance on Workers Paid is billed at
$0.011 per 1,000 neurons.

The OpenRouter comparison used actual response usage on 2026-09-12. Muse measured 22.18-second p50
and 31.48-second p95 latency. Qwen measured 69.93-second p50 and 91.69-second p95 and timed out twice
under the original 45-second smoke ceiling before succeeding with a 120-second benchmark ceiling.
Only Muse passed the identity gate; no paid fallback is configured.

SovereignEG's authenticated model catalog reported a 1,048,576-token context, 16,384-token maximum
output, three healthy routed backends, and the EGP rates above on 2026-09-11. Confirm the catalog and
balance again before release.

Sources: https://docs.ascendapi.com/products/edb-v1/overview,
https://sovereigneg.com/docs/models-api,
https://openrouter.ai/docs/guides/overview/multimodal/image-generation,
https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/,
https://developers.cloudflare.com/workers-ai/platform/pricing/, and
https://docs.mistral.ai/models/ocr-4-1.
