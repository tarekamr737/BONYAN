# BONYAN Workstream 06 — Release Engineering & Hardening

## Mission

Make BONYAN deployable, observable, recoverable, abuse-resistant, and verifiable on real
native devices.

## Ownership

- `infra/**`
- `.github/**`
- `deployment/**`
- `tests/release/**`
- `docs/release/**`
- `docs/operations/**`
- mobile build/release and environment-specific release configuration

Shared source changes are limited to narrow release or security defects. Production AI
provider selection and implementation remain owned by Workstream 05.

## Priorities

Security/privacy, deployability/recoverability, correctness, KISS, observability, AHA/YAGNI,
then DRY. Keep the modular monolith; do not add queues, caches, microservices, or Kubernetes
without a measured release blocker.

## Release Rules

- Isolate staging and production configuration and secrets.
- Require HTTPS and private object storage outside local development.
- Never commit credentials, signing material, source uploads, tokens, or sensitive measurements.
- Apply simple, testable rate limits to auth, OCR, Coach, Avatar, and media-token endpoints.
- Feature branches run CI only; production requires a release/tag and explicit approval.
- Never claim native verification without a real device, emulator, or simulator and recorded evidence.
- Any release-stage UI change must use Impeccable and preserve the existing design system.

