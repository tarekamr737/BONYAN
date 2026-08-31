# BONYAN Workstream 06 — Release Engineering & Hardening Architecture

## Runtime

```text
Expo mobile app -> HTTPS -> FastAPI modular monolith -> PostgreSQL / private object storage
                                                     -> external providers
```

Release infrastructure wraps this topology; it does not create another application architecture.

## Environment Boundaries

Local, staging, and production use separate configuration and credentials. Staging must never
reuse production databases, buckets, provider keys, JWT secrets, or signing material.

## Delivery Flow

```text
feature branch -> validation only
main           -> staging deployment when configured -> smoke check
release/tag    -> explicit approval -> production -> health/smoke check
```

## Operational Boundaries

- Liveness reports process availability; readiness verifies required dependencies safely.
- Structured logs contain request ID, route template, status, latency, and safe error/provider category.
- Database backups have documented retention and restore verification.
- Deployment rollback targets the previous immutable release; migration rollback is evaluated separately.
- Private objects use opaque keys, private ACLs, short-lived access, cleanup, and deletion.

