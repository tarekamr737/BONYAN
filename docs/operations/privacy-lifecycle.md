# Privacy and Account Lifecycle

## Logout

The mobile app clears the in-memory token and platform secure storage (or web session storage).
Tokens are not logged. The API uses short-lived stateless access tokens; logout does not maintain a
server-side revocation list. Account deletion removes the account row, and every private request
checks that row, immediately invalidating all previously issued tokens for that account.

## Item Deletion

- Deleting an InBody scan deletes its private source object before marking the scan deleted.
- Deleting an Avatar deletes its generated private object and database record through the Avatar service.
- The current Avatar MVP does not accept or persist source photos.
- Deleting a Community post removes its dependent reactions and reports through database cascade.
- All item operations enforce ownership from the authenticated user, not a request-supplied owner ID.

## Account Deletion

`DELETE /api/v1/me` performs synchronous MVP cleanup inside the existing monolith:

1. ask each current domain lifecycle boundary to remove the account's owned data;
2. delete InBody and generated Avatar private objects, aborting safely if storage is unavailable;
3. delete reports and reactions made by the user;
4. delete owned posts, workout sessions/plans, avatars, manual Avatar body metrics, InBody
   records, profile, and account;
5. commit through the request-scoped database transaction;
6. clear mobile query/session state after the API succeeds.

The endpoint is retry-safe because private-object deletion is idempotent. It does not use a queue or
distributed workflow. Backup retention is governed by the backup runbook; restored backups must be
handled as restricted recovery material and must not silently republish deleted private objects.

## Verification

Automated tests cover cross-user InBody deletion, Avatar private-object deletion, manual body-metric
deletion, post deletion, cross-domain account cleanup, storage-failure abort behavior, immediate
post-deletion token rejection, and the mobile DELETE contract. After Person 05 is merged, re-audit
its source-photo persistence and add any new owned tables/objects to the Avatar lifecycle boundary.
A staging PostgreSQL execution remains required before release sign-off.
