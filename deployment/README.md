# Deployment Configuration

The checked-in `*.env.example` files define names only. Create real environment variables in
the chosen hosting and mobile build systems; never copy credentials into Git.

## Required Release Topology

- Terminate HTTPS before the FastAPI service and forward only trusted traffic.
- Use separate managed PostgreSQL databases and database roles for staging and production.
- Run `alembic upgrade head` as a one-off release step before switching application traffic.
- Probe `/health` for liveness and `/ready` for required database readiness.
- Build the mobile binary with the environment-matching `EXPO_PUBLIC_API_URL`.

## Private Object Storage Decision

The current application only implements `LocalPrivateObjectStorage`. A durable shared filesystem
may satisfy the interface on a single-instance host, but it does not provide independent object
backup or safe multi-instance behavior. Before staging is deployable, Person 01 must approve one
of the following and supply the environment contract:

1. a platform-provided encrypted persistent volume mounted at `PRIVATE_STORAGE_ROOT`; or
2. an approved private object-store adapter with least-privilege credentials and short-lived access.

Do not deploy staging or production with ephemeral container storage. The staging and production
volumes/buckets, credentials, and retention policies must be separate.

## Hosting Decision Still Required

No hosting platform, DNS name, TLS termination, database service, or storage provider is approved
in the repository. The templates deliberately use `REPLACE_...` markers and do not silently select
or provision a paid platform.

