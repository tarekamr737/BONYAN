# Workstream 04 integration

Workstream 04 exposes provider-neutral avatar and community domains plus Expo route
adapters. Central application wiring remains owned by Workstream 01.

## Backend composition

Build one `AvatarService` with:

- `SqlAlchemyAvatarRepository(session)`
- a production implementation of `PrivateAvatarStorage`
- `MockAvatarProvider(model=settings.avatar_model)` until a provider is selected

Build one `CommunityService` with:

- `SqlAlchemyCommunityRepository(session)`
- the composed `AvatarService` as its `AvatarIdentityReader`

Register the routers below the existing `/api/v1` prefix:

```python
create_avatar_router(avatar_service, get_current_user_id)
create_community_router(community_service, get_current_actor)
```

`get_current_user_id` must return the trusted authenticated user ID.
`get_current_actor` must return `CommunityActor(user_id=..., display_name=...)` from
the trusted auth/profile context. Do not accept either value from request JSON or
query parameters.

The baseline `app.core.providers.AvatarProvider` accepts a text prompt only, while
the private source-photo workflow requires image bytes and media type. This
workstream therefore exposes the required provider-neutral contract from
`app.domains.avatar.contracts` and re-exports it from
`app.integrations.avatar.provider`. Reconcile the shared contract during central
composition; provider SDK types must remain inside `app.integrations.avatar`.

## Database migration

Create the central Alembic revision in Workstream 01's migration path. Its upgrade
must call avatar before community:

```python
from app.domains.avatar.migration import upgrade as upgrade_avatar
from app.domains.community.migration import upgrade as upgrade_community

upgrade_avatar(op)
upgrade_community(op)
```

Downgrade in reverse order. Import `app.domains.avatar.models` and
`app.domains.community.models` wherever the central metadata registry imports domain
models if autogeneration is used.

The community tables intentionally do not create a database foreign key to avatar
storage. Avatar availability and ownership are enforced through
`AvatarIdentityReader`, so an unapproved or community-disabled asset never appears in
the feed.

## Private storage contract

Implement `PrivateAvatarStorage` with authenticated private object storage:

- source and generated objects are private at rest
- read URLs are short-lived signed URLs; the service requests 300 seconds
- delete is idempotent so a partially completed deletion can be retried safely
- image bytes and object keys are excluded from logs

`AVATAR_MODEL` stays `TBD`. The deterministic mock is the development/test default;
choosing or adding a production image provider is outside this workstream.

## Mobile composition

The route adapters are:

- `apps/mobile/app/avatar/index.tsx`
- `apps/mobile/app/community/index.tsx`
- `apps/mobile/app/community/create.tsx`

Link `/avatar` and `/community` from the authenticated app shell after auth and
profile are available. The existing API client must attach the authenticated session
to these requests. Configure `EXPO_PUBLIC_API_URL` for a physical device or emulator;
`127.0.0.1` addresses the device itself outside a local web runtime.

Add Expo Image Picker's config plugin to the centrally owned `app.json` before a
native build so the photo-library permission copy can be set explicitly. Expo Doctor
currently also reports the baseline `newArchEnabled` field as unsupported by its
current schema; resolve that config centrally rather than from this workstream.

The root npm workspace currently keeps `@types/react` below
`apps/mobile/node_modules` while `react-native` is hoisted at the root. A clean local
install may need the shared type package made visible at the root (or the workspace
install layout aligned) before `tsc` can resolve React Native JSX declarations. This
is a baseline workspace dependency issue and is not addressed from Workstream 04's
owned paths. The baseline lock also resolves `eslint@9.39.5` while the mobile manifest
requests `eslint@^10.9.0`; `npm@11 ci --dry-run` rejects that pre-existing mismatch.
Regenerate the complete lock once the root workspace package layout is centrally
owned and stable.

## Public behavior

- Avatar approval and community enablement are separate explicit mutations.
- Source-photo fields and object keys never occur in response schemas.
- Posts contain only explicit caption/type/avatar input; no InBody data is accepted.
- Feed order is `(created_at, id)` descending with an opaque cursor.
- One reaction and one report are stored per user/post; repeats are idempotent.
- Only an owner can delete their post or inspect/mutate their avatar.

After composition, run `npm run lint`, `npm run typecheck`, `npm test`, migrate a clean
PostgreSQL database, and smoke-test the three Expo routes on an authenticated device.
