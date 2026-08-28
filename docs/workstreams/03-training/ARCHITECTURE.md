# BONYAN Workstream 03 - Training Intelligence Architecture

## Backend Flow
```text
Training router -> TrainingService -> WorkoutPlanner
                                |-> TrainingRepository
                                |-> MuscleWikiExerciseProvider
```

## Coach Flow
```text
CoachService -> LLMProvider(TBD/mock)
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

## MuscleWiki Boundary
`integrations/musclewiki` exposes:
- `search_exercises(filters, page, page_size)`
- `get_exercise(exercise_id)`
- `get_media_access(exercise_id)`

The client maps provider failures to provider errors and caches fetched metadata in memory.

## Integration Required From Person 01
- Include `app.domains.training.router.router` in `apps/api/app/core/routing.py`.
- Add a home/app-shell route link to `/training` when central navigation is ready.
- Add `MUSCLEWIKI_API_KEY` to shared settings/env examples if production credentials are provisioned.
