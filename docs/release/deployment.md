# Deployment Procedure

## Staging

1. Point the staging DNS name at the isolated host and allow inbound TCP 80/443 only.
2. Copy `deployment/staging/compose.env.example` to untracked `compose.env` and replace every marker.
3. Copy `deployment/staging/api.env.example` to untracked `api.env`; set the PostgreSQL host to `postgres`, use the matching isolated role, and replace every marker.
4. Confirm `API_ENV=staging`, the public URL uses HTTPS, and the private-storage path is `/var/lib/bonyan/private`.
5. Run `docker compose --env-file compose.env -f deployment/staging/compose.yaml config` and inspect the result without publishing it.
6. Build and start with `docker compose --env-file compose.env -f deployment/staging/compose.yaml up -d --build`.
7. Confirm the migration container exits zero and API/edge containers are healthy.
8. Run `.venv/Scripts/python deployment/smoke_check.py https://STAGING_HOST` (use the platform-appropriate Python path).

Caddy obtains and renews TLS for the configured hostname. PostgreSQL and private objects have
separate named volumes and are not exposed publicly. This reference is appropriate for one host;
an approved managed platform may translate the same boundaries without changing the application.

## Production

Production must use a validated immutable commit/tag, separate secrets/data, and the manual GitHub
`production` environment approval. Before approval, attach CI results, staging smoke evidence,
backup status, migration review, native QA status, and the rollback target. Run the migration as a
one-off task, deploy the exact approved image, then run the HTTPS smoke checker. Feature branches
and ordinary pushes to `main` never deploy production.
