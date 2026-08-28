# BONYAN Workstream 03 - Training Intelligence Agent Rules

## Mission
Build BONYAN's deterministic workout engine, training experience, MuscleWiki integration, and provider-neutral AI coach.

## Owned Paths
- `apps/mobile/src/features/training/**`
- `apps/mobile/app/**/training/**`
- `apps/api/app/domains/training/**`
- `apps/api/app/integrations/musclewiki/**`
- `apps/api/app/integrations/llm/**`
- `tests/training/**`
- `docs/workstreams/03-training/**`

## Core Principle
The LLM converses. Deterministic services make training decisions.

Never let free-form LLM output directly create or mutate authoritative workout state.

## Locked Provider
- Exercise provider: `https://api.musclewiki.com/`
- Permanent credentials must stay backend-side.
- Filter and paginate server-side.
- Keep MuscleWiki IDs as external references.
- Do not download the whole database or permanently host provider videos.

## Model Status
- `CHAT_MODEL=TBD`
- Use `LLMProvider` and `MockLLMProvider`.
- Do not choose a production vendor in this workstream.

## Cross-Domain Rule
Training may read confirmed InBody data only through the InBody domain service contract.
Training must never call OCR or Mistral integrations directly.

## Parallel Integration
This workstream exports router and screen modules. Core platform registration should be done by Person 01 after merge.
