# GitHub Release Environments

Create `staging` and `production` environments in repository settings.

## Staging

- Restrict deployment branches to `main`.
- Do not store production credentials in this environment.
- `main` publishes `bonyan-api:staging` and an immutable SHA tag to GHCR after CI succeeds through branch protection.

## Production

- Restrict deployment refs to `v*` tags and `main` for deliberate manual dispatch.
- Configure required reviewers and prevent self-review where the repository plan supports it.
- Do not permit administrators to bypass protection where the repository plan supports that control.
- Protect the `production` tag mapping; the immutable `production-<sha>` image is the rollback identity.

The workflow publishes approved images but cannot roll out to a host until hosting is selected.
When that decision is made, add a host-specific deployment job after image publication, scoped to the
matching GitHub environment, and finish with `deployment/smoke_check.py` against its HTTPS URL.
