# BONYAN Workstream 03 - Training Intelligence Agent Rules

## Mission
Build BONYAN's deterministic workout engine, training experience, provider-neutral exercise integration, and AI coach.

## Owned Paths
- `apps/mobile/src/features/training/**`
- `apps/mobile/app/**/training/**`
- `apps/api/app/domains/training/**`
- `apps/api/app/integrations/exercises/**`
- `apps/api/app/integrations/exercisedb/**`
- `apps/api/app/integrations/musclewiki/**`
- `apps/api/app/integrations/llm/**`
- `tests/training/**`
- `docs/workstreams/03-training/**`

## Core Principle
The LLM converses. Deterministic services make training decisions.

Never let free-form LLM output directly create or mutate authoritative workout state.

## Locked Provider
- Exercise provider: ExerciseDB V1 at `https://oss.exercisedb.dev/api/v1`.
- ExerciseDB does not require a credential; all other provider credentials stay backend-side.
- Filter and paginate server-side.
- Keep provider exercise IDs as external references.
- Do not download the whole database or permanently host provider videos.

## Model Status
- Release Coach model: `glm-5.3-flash` through SovereignEG.
- Use `LLMProvider` and `MockLLMProvider`.
- Keep provider selection isolated from training domain logic.

## Cross-Domain Rule
Training may read confirmed InBody data only through the InBody domain service contract.
Training must never call OCR or Mistral integrations directly.

## Parallel Integration
This workstream exports router and screen modules. Core platform registration should be done by Person 01 after merge.
