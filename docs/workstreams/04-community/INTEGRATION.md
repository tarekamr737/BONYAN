# Workstream 04 integration

Workstream 04 exposes provider-neutral avatar and community domains plus Expo route
adapters. Central application wiring remains owned by Workstream 01.

## Backend composition

Build one `AvatarService` with:

- `SqlAlchemyAvatarRepository(session)`
- a production implementation of `PrivateAvatarStorage`
- an adapter implementing `BodyMetricsReader` from the newest confirmed InBody or
  manual-profile snapshot
- an adapter implementing `ManualBodyMetricsWriter` that persists user-confirmed
  manual measurements in the shared profile/measurement store
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

`BodyMetricsReader.latest_confirmed(owner_id)` is the read boundary to InBody/User
data. It returns the most recent confirmed `BodyMetricsSnapshot` containing height,
weight, optional body-fat and skeletal-muscle values, timestamp, and source. Implement
the adapter against Workstream 02/User public contracts; do not read OCR internals.
`ManualBodyMetricsWriter.save_manual(owner_id, snapshot)` is the corresponding write
boundary for the explicit `PUT /avatars/manual-measurements` flow. Persist manual data
per owner, then make `latest_confirmed` compare timestamps across manual and confirmed
InBody snapshots. When no confirmed snapshot exists, avatar creation returns
`body_metrics_required` without creating an asset. `StaticBodyMetricsReader` is only
for local development and tests.

The provider-neutral `AvatarGenerationRequest` receives the metrics snapshot with
`repr=False`, plus `BodyAvatarStyle` and `BodyAvatarPresentation`. The avatar creation
schema accepts only style and presentation; raw values are saved through the separate,
validated, authenticated manual-measurements endpoint and are never returned in avatar
responses. Body-photo upload is intentionally unsupported. Provider SDK types must
remain inside `app.integrations.avatar`.

The development `MockAvatarProvider` implements `cinematic_3d` with deterministic
men/women portrait fixtures. The interactive client supports six respectful broad
profiles: Skinny, Slim, Normal, Fit, Strong, and Full. `classify_body_shape` uses
height, weight, optional body-fat, optional skeletal-muscle mass, and presentation;
the preview buttons never override the server-calculated result. This is a broad
visual estimate rather than a diagnosis. A future production provider should preserve
the same style/presentation/metrics boundary while rendering continuous proportions.

The shared baseline contract in `app.core.providers.contracts` is prompt-oriented
(`AvatarRequest(prompt)`). Workstream 04 consumes its domain-owned
`AvatarGenerationRequest(metrics, style, presentation)` in
`app.domains.avatar.service` and `app.integrations.avatar.mock`. During central
integration, Person 01 should add a backward-compatible measurements-aware request or
adapter and keep the existing prompt request available for other consumers. No source
image is required, and no avatar vendor should be selected as part of reconciliation.

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

- generated avatar objects are private at rest
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

The 3D body viewer loads provider/CDN GLB URLs from
`EXPO_PUBLIC_AVATAR_MEN_MODEL_URL` and `EXPO_PUBLIC_AVATAR_WOMEN_MODEL_URL`. Local
MetaPerson sample files are evaluation-only; confirm distribution rights and replace
them with licensed production assets before release.

Expo Image Picker is not used by the final metrics-only avatar flow. Do not add its
config plugin or camera/photo-library permission copy for Workstream 04. The avatar
route reads measurement status and generated preview data from authenticated APIs,
and sends manual values only through the explicit authenticated save action.

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
- Body photos and raw measurements are rejected by the avatar creation schema.
- Manual values are accepted only by the validated, authenticated
  `PUT /avatars/manual-measurements` endpoint and persisted per owner.
- Raw metric values and generated object keys never occur in response schemas.
- Only source type, data timestamp, metric-field availability, and calculated broad
  shape are returned privately.
- Posts contain only explicit caption/type/avatar input; no InBody data is accepted.
- Feed order is `(created_at, id)` descending with an opaque cursor.
- One reaction and one report are stored per user/post; repeats are idempotent.
- Only an owner can delete their post or inspect/mutate their avatar.

After composition, run `npm run lint`, `npm run typecheck`, `npm test`, migrate a clean
PostgreSQL database, and smoke-test the three Expo routes on an authenticated device.
