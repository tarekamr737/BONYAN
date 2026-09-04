# Secrets Inventory and Rotation

Real values live only in the environment's secret manager or native signing service. Staging and
production must use different values, service identities, databases, buckets/volumes, and signing
credentials. Access is limited to deployment identities and operators who need it.

| Secret | Purpose | Least privilege / rotation |
| --- | --- | --- |
| `DATABASE_URL` | API PostgreSQL connection | Environment-specific app role; no superuser or cross-environment access. Rotate DB password, update secret, restart, then revoke the old credential. |
| `AUTH_JWT_SECRET` | Access-token signing | Unique 32+ byte random value per environment. Rotation invalidates existing sessions with the current single-key implementation; schedule and communicate it. |
| `MISTRAL_API_KEY` | OCR provider | Restrict to the OCR project/environment and provider quota. Replace in secret manager, restart, validate OCR, revoke old key. |
| `MUSCLEWIKI_API_KEY` | Exercise/media provider | Restrict by provider-supported project/quota controls. Replace, validate lookup/media, revoke old key. |
| Storage credential | Private object read/write/delete | Name depends on the approved storage adapter. Scope to one environment and bucket/volume; deny public ACL administration where supported. |
| Coach provider credential | Coach provider access | Environment variable name and provider remain a Workstream 05 integration dependency. Scope and rotate after that contract lands. |
| Avatar provider credential | Avatar generation access | Environment variable name and provider remain a Workstream 05 integration dependency. Scope and rotate after that contract lands. |
| Android upload/signing key | Android release identity | Store in the mobile build/signing service, never as a repository file. Restrict release roles and follow store key-upgrade/recovery procedures. |
| iOS distribution credentials | iOS signing and delivery | Store in Apple/build-service managed signing. Restrict App Store Connect roles and rotate/revoke compromised certificates or API keys. |

## Rotation Checklist

1. Create a replacement in the target environment; never copy the other environment's value.
2. Grant only the permissions listed above and record the owner and expiry in the secret manager.
3. Update the environment secret reference and deploy/restart through the normal gate.
4. Run `/health`, `/ready`, authentication, and the affected provider/storage smoke check.
5. Revoke the old credential and verify it no longer works.
6. Record the rotation date and result outside Git; do not record the value.

If exposure is suspected, revoke first where that is safer than overlapping credentials, invalidate
sessions when `AUTH_JWT_SECRET` is involved, inspect safe audit metadata, and follow the rollback or
incident procedure. Never paste a secret into logs, issues, pull requests, or chat.
