# Production Provider Decisions

Status as of 2026-09-04: implementation-complete, no final Coach or Avatar
production model selected. Live benchmark evidence is still required.

## Coach

No production Coach model is selected yet. The benchmark candidates are OpenAI
`gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`; `gpt-5.6-terra` is only the
balanced candidate in the shortlist, not the winner. The adapter uses the
Responses API, `strict: true` function schemas, one bounded tool round,
`store: false`, and a hashed safety identifier.

The final Coach decision must wait until every candidate has run against
`coach-test-set.json`, human Arabic scoring is complete, and comparable latency,
cost, tool-call validity, hallucination, and reliability metrics are recorded.
Any candidate below 98% valid tool arguments, or any candidate that invents
authoritative user state, is ineligible.

Sources: https://developers.openai.com/api/docs/models and https://developers.openai.com/api/reference/cli/resources/responses/methods/create

## Avatar

No production Avatar model is selected yet. The benchmark candidates are Google
`gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, and
`gemini-3-pro-image`; `gemini-3.1-flash-image` is only the balanced candidate in
the shortlist, not the winner. The adapter accepts private image input and
returns normalized private image bytes.

The final Avatar decision must wait until every candidate has run against the
same consented private fixtures and human scoring covers identity, facial
consistency, body realism, prompt adherence, regeneration consistency,
privacy/safety behavior, latency, cost, and reliability.

Sources: https://ai.google.dev/gemini-api/docs/image-generation and https://ai.google.dev/gemini-api/docs/pricing

## Locked Integrations

Mistral OCR remains `mistral-ocr-4-1`, currently GA at $4 per 1,000 pages. MuscleWiki remains the exercise/media provider. Its API uses `X-API-Key`, `/search?q=...`, and `limit`/`offset`; permanent keys stay in the backend and media reaches clients only through BONYAN's user-bound short-lived relay token.

Sources: https://docs.mistral.ai/models/ocr-4-1 and https://api.musclewiki.com/documentation
