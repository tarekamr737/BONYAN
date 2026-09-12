# BONYAN Workstream 03 - Training Intelligence Architecture

## Backend Flow
```text
Training router -> TrainingService -> WorkoutPlanner
                                |-> TrainingRepository
                                |-> ExerciseProvider
                                      |-> ExerciseDbClient (active)
                                      |-> MuscleWikiClient (legacy opt-in)
```

## Coach Flow
```text
CoachService -> LLMProvider(OpenRouter Nemotron 3 Ultra / mock)
            -> validated CoachToolExecutor
            -> deterministic services
```

## Deterministic Engine
The engine owns frequency, split selection, exercise constraints, movement coverage, equipment compatibility, experience constraints, duration constraints, sets, reps, rest, progression, substitutions, and basic recovery-aware inputs.

Current MVP implementation:
- `WorkoutPlanner` chooses split templates by days/week.
- `rules.py` centralizes sets/reps/rest/duration defaults.
- `decide_progression` implements double progression increase/hold/regress.
- `choose_substitution` preserves muscle overlap and equipment availability.

## Exercise Provider Boundary
`integrations/exercises` defines the provider-neutral contract. The active
`integrations/exercisedb` adapter exposes:
- `search_exercises(filters, page, page_size)`
- `get_exercise(exercise_id)`
- `get_media_access(exercise_id)`

The client maps provider failures to generic provider errors, caches fetched metadata in memory,
and accepts only official ExerciseDB API and media hosts. MuscleWiki remains an explicit legacy
adapter and is not an MVP runtime dependency.

## Integration Required From Person 01
- Include `app.domains.training.router.router` in `apps/api/app/core/routing.py`.
- Add a home/app-shell route link to `/training` when central navigation is ready.
- Configure `EXERCISE_PROVIDER=exercisedb` and the fixed official V1 base URL.
