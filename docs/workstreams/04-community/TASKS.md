# Workstream 04 task status

## Contracts and persistence

- [x] Define source-capable avatar request/result and avatar states.
- [x] Define strict post, reaction, report, feed, and cursor schemas.
- [x] Add avatar, post, reaction, and report SQLAlchemy models.
- [x] Add domain-owned migration helpers and user-scoped repositories.
- [x] Enforce one reaction and one report per user/post.

## Avatar and privacy

- [x] Keep provider selection isolated and `AVATAR_MODEL=TBD`.
- [x] Implement deterministic `MockAvatarProvider` and provider error abstraction.
- [x] Validate JPEG, PNG, and WebP source images with a 5 MB decoded limit.
- [x] Store source and generated objects through private storage only.
- [x] Implement generate, detail/list, approve, reject, regenerate, community-use, and delete.
- [x] Keep approval separate from explicit community enablement.
- [x] Return only short-lived preview URLs; never serialize source bytes or object keys.
- [x] Handle provider errors/timeouts without exposing partial assets.

## Community

- [x] Implement recent-first opaque-cursor feed pagination.
- [x] Implement explicit milestone/progress post creation and owner-only deletion.
- [x] Require an owned, approved, community-enabled avatar when an avatar is attached.
- [x] Implement add/change/remove reaction with optimistic mobile reconciliation.
- [x] Implement idempotent reporting.
- [x] Reject undeclared fields, including raw reports and body measurements.

## Mobile UX

- [x] Build private source-photo selection and validation feedback.
- [x] Build generation, preview, approval, rejection, regeneration, and deletion states.
- [x] Build a separate, explicit community-use privacy control.
- [x] Build feed, post card, create-post, reaction, delete, and report flows.
- [x] Build loading, empty, error, refresh, and infinite-pagination states.
- [x] Reuse BONYAN tokens and prototype typography/color direction with accessible controls.

## Verification

- [x] Cover source/unapproved/approved avatar privacy and cross-user access.
- [x] Cover provider failure, timeout, regeneration, and deletion.
- [x] Cover post creation/deletion, forbidden delete, reactions, pagination, and reports.
- [x] Cover mobile privacy filtering, optimistic reactions, and relative time.
- [x] API and mobile lint pass.
- [x] Mobile typecheck passes in the current verified install.
- [x] API and mobile tests pass.
- [ ] Person 01: create/register the central migration, auth dependencies, storage, routers, and app-shell entries.
- [ ] Person 01: resolve the clean-install root React typings/workspace layout noted in `INTEGRATION.md`.
- [ ] Integration environment: smoke-test authenticated API and native Android/iOS routes.
