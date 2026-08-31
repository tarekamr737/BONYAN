# Monitoring and Incident Triage

Monitor the HTTPS service from outside the deployment boundary. Use `/health` for process
liveness and `/ready` for database readiness. Never include query strings, request bodies,
authorization headers, uploaded filenames/content, measurements, or provider responses in logs.

## Minimum Signals

| Signal | Source | Initial alert condition |
| --- | --- | --- |
| Availability | `/health` | Two consecutive failures over two minutes. |
| Database readiness | `/ready` | Any sustained 503 for two minutes. |
| API errors | `request_completed.status_code` | 5xx ratio above 2% for five minutes, with a minimum of 20 requests. |
| API latency | `request_completed.duration_ms` | p95 above 1,500 ms for ten minutes; split by route template. |
| Provider availability | `provider_request_failed` | Five failures for one provider in five minutes, or any sustained outage. |
| Abuse pressure | response code 429 | Sudden sustained increase; do not alert on isolated expected throttles. |

Tune thresholds from staging and real traffic; these are conservative starting points, not scale
claims. Route templates and provider categories are safe dimensions. User IDs, tokens, object keys,
email addresses, captions, Coach prompts, OCR output, and measurements are not.

## Triage

1. Confirm `/health` and `/ready` from outside the service network.
2. Correlate safe request IDs across `request_failed`, `request_completed`, and provider events.
3. Separate database readiness, one-provider failure, and general 5xx/latency incidents.
4. If a deployment caused the incident, follow the deployment rollback runbook.
5. If a migration caused it, stop rollout and use the migration decision procedure; never improvise a destructive downgrade.
6. Record timing, affected route/provider categories, release SHA, and remediation without private payloads.

The selected hosting platform must route structured stdout logs and health probes to its monitoring
service. No paid observability vendor is selected by this repository.
