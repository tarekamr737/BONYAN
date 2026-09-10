# Provider Cost Estimate

Estimate date: 2026-09-04. These are candidate-planning list-price estimates,
not final model decisions or invoices. Recalculate after live usage capture,
final provider selection, and contract pricing.

| Unit | Assumption | Estimate |
|---|---|---:|
| OCR report | One Mistral OCR 4.1 page at $4/1,000 pages | $0.004 |
| 10 Coach messages | Each uses 1,000 input and 300 output tokens on the balanced Coach candidate | $0.056 |
| Workout conversation | Five turns, each 1,500 input and 400 output tokens on the balanced Coach candidate | $0.039 |
| Avatar generation | One balanced Avatar candidate 1K output plus rounded image/text input | $0.068 |
| Active user/day | 10 Coach messages, one workout conversation, plus 1/30 OCR and 1/30 Avatar | $0.097 |
| Active user/month | 30 active days under the row above | $2.92 |

Balanced Coach candidate formula: `(input_tokens * 2 + output_tokens * 12) /
1,000,000`. Avatar generation is the largest single event; repeated Coach usage
is the largest ongoing cost driver under these assumptions. MuscleWiki
subscription/quota charges, storage, bandwidth, retries, taxes, and provider
discounts are excluded because they depend on the purchased plan and measured
traffic.

Sources: https://developers.openai.com/api/docs/models, https://ai.google.dev/gemini-api/docs/pricing, and https://docs.mistral.ai/models/ocr-4-1

## Release-candidate status — 2026-09-10

These values remain provisional. No Coach or Avatar candidate passed the complete live and human
benchmark gates, MuscleWiki access returned HTTP 403, and no staging traffic measurements exist.
The failed OpenRouter `openai/gpt-oss-120b` run is not used to replace the planning estimates.
Final per-user/day and per-user/month costs therefore remain a release blocker rather than a
fabricated measurement.
