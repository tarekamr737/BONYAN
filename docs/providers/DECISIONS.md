# Production Provider Decisions

Status as of 2026-09-04: implementation-complete, live benchmark pending credentials.

## Coach

The provisional production selection is OpenAI `gpt-5.6-terra`. OpenAI describes Terra as the GPT-5.6 balance of intelligence and cost, with function calling and structured outputs. The adapter uses the Responses API, `strict: true` function schemas, one bounded tool round, `store: false`, and a hashed safety identifier. Current list pricing is $2 per million input tokens and $12 per million output tokens.

Candidates are `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna`. They span a quality ceiling, balanced tier, and cost floor while sharing one provider contract and benchmark harness. Terra must not be promoted beyond staging until `coach-test-set.json` passes the live scoring gate, including Egyptian Arabic review and at least 98% valid tool arguments.

Sources: https://developers.openai.com/api/docs/models and https://developers.openai.com/api/reference/cli/resources/responses/methods/create

## Avatar

The provisional production selection is Google `gemini-3.1-flash-image` (Nano Banana 2). Google's current guidance calls it the all-around image generation/editing choice and specifically describes multiple-reference processing and consistency. It accepts private image input and has an estimated 1K output price of $0.067.

Candidates are `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, and `gemini-3-pro-image`. They span cost/latency, balanced production, and quality ceiling. Flash Image must not be promoted beyond staging until consented private fixtures pass identity, realism, consistency, safety, latency, and cost review.

Sources: https://ai.google.dev/gemini-api/docs/image-generation and https://ai.google.dev/gemini-api/docs/pricing

## Locked Integrations

Mistral OCR remains `mistral-ocr-4-1`, currently GA at $4 per 1,000 pages. MuscleWiki remains the exercise/media provider. Its API uses `X-API-Key`, `/search?q=...`, and `limit`/`offset`; permanent keys stay in the backend and media reaches clients only through BONYAN's user-bound short-lived relay token.

Sources: https://docs.mistral.ai/models/ocr-4-1 and https://api.musclewiki.com/documentation
