# BONYAN Workstream 03 - Training Intelligence Tasks

## A. Contracts
- [x] Define planning context and workout schemas.
- [x] Define progression and logged-set schemas.
- [x] Add schema tests.

## B. Persistence
- [x] Create plan/session/logged-set DB models.
- [x] Add migrations.
- [x] Add user-scoped repositories and auth tests.

## C. Exercise Provider
- [x] Add backend-only client boundary.
- [x] Implement search/details.
- [x] Add pagination/filtering.
- [x] Add metadata cache.
- [x] Implement short-lived media access interface.
- [x] Add error mapping and mocks.

## D. Engine Foundation
- [x] Normalize planning inputs.
- [x] Implement goal/experience rules.
- [x] Implement days/week split selection.
- [x] Implement session-duration/equipment constraints.

## E. Exercise Selection
- [x] Define movement/muscle coverage rules.
- [x] Retrieve eligible provider candidates.
- [x] Filter incompatible exercises.
- [x] Select deterministically.
- [x] Validate final references.

## F. Prescription
- [x] Assign sets/rep ranges/rest.
- [x] Assign intensity target where used.
- [x] Add explainable progression rules.
- [x] Add final engine validation.
- [x] Add engine unit tests.

## G. Plan API
- [x] Add generate/current endpoint exports.
- [x] Add activate/replace plan workflow.
- [x] Add cross-user tests.

## H. Workout Session
- [x] Start session.
- [x] Log/edit/remove set.
- [x] Complete exercise/workout.
- [x] Persist summary.
- [x] Add tests.

## I. Progression / Substitution
- [x] Implement progression success/hold/regress rules.
- [x] Implement exercise substitution.
- [x] Respect equipment constraints.
- [x] Add tests.

## J. Mobile
- [x] Build training home/current plan.
- [x] Build workout day.
- [x] Build exercise card/detail/video placeholder.
- [x] Build active set logging controls.
- [x] Build completion flow/history placeholder.

## K. Coach Provider
- [x] Wire `LLMProvider` + mock.
- [x] Keep model selection provider-neutral; release locks SovereignEG
  `glm-5.3-flash`.
- [x] Define compact coach schemas.

## L. Coach Tools
- [x] Add owner-scoped profile and latest-confirmed-InBody read tools.
- [x] Add plan/history read tools.
- [x] Add exercise search/details tools.
- [x] Add plan generate/log tools.
- [x] Validate all tool arguments.

## M. Coach UX
- [x] Build coach chat shell.
- [x] Add provider/tool failure contract.
- [x] Enforce fitness scope.

## N. Final
- [x] Test no-InBody fallback.
- [x] Test beginner/advanced/equipment cases.
- [x] Test exercise-provider and LLM outages.
- [x] Test invalid coach tool call.
- [x] Lint passes.
- [x] Typecheck passes.
- [x] Tests pass.

## Blockers / Next Step
- Person 01 central registration is required for API router inclusion and app-shell navigation.
- ExerciseDB live search, detail, filters, and media retrieval are verified; public-service
  availability and rate limits remain operational risks.
