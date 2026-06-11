# API Reference

All endpoints live under Nuxt Nitro at `server/api/*` and respond with the
unified shape:

```json
{ "code": 0, "msg": "OK", "data": {} }
```

`code === 0` means success. Non-zero codes are logical errors; HTTP status is
generally still 200 so clients can read the body uniformly. See
`server/utils/api.ts`.

## Base URL

| Environment | URL |
|---|---|
| Docker (`docker-compose.yml`) | `http://localhost:8080` |
| Local dev (`pnpm dev`) | `http://localhost:3000` |

## Health

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | Readiness check. Returns `{ ok, now }` only; it does not expose `DATABASE_PATH`. |

## Audit Logs

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/audit-logs` | Cursor-paginated admin audit stream. Query `limit, cursor, eventType, outcome`. Returns sanitized metadata. |

## Domains

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/domains` | List + filter. Query `page, limit, search, status, watchKind, priority, group, tags, sslState, expiringDays`. Items include risk summary fields. |
| `POST` | `/api/domains` | Create a domain and run initial security checks for owned domains. |
| `GET` | `/api/domains/:id` | Detail with latest status, SSL status, security findings, risk summary, and first page of history. |
| `PUT` | `/api/domains/:id` | Update domain metadata, watch kind, priority, tags, group, and active flag. |
| `DELETE` | `/api/domains/:id` | Delete the domain and cascaded dependent rows. |
| `POST` | `/api/domains/:id/refresh` | Trigger immediate RDAP + SSL scan and owned-domain security scan. |
| `GET` | `/api/domains/:id/history` | Cursor-paginated RDAP history. Query `limit, cursor`; returns `{ items, nextCursor, limit }`. |
| `POST` | `/api/domains/import` | CSV import using multipart upload. |
| `GET` | `/api/domains/export` | CSV export. |

## Actions

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/actions` | Action queue with embedded domain info. Query `page, limit, status, priority, domainId, archived`; active records are returned by default, and `archived=1` shows archived records. |
| `POST` | `/api/actions` | Manual action create. |
| `POST` | `/api/actions/archive` | Archive active actions by explicit `ids` or by filters `{ status?, priority?, domainId? }`; returns `{ archived }`. |
| `PATCH` | `/api/actions/:id` | Update action status, including snooze, dismiss, and resolve. |

## Security Findings

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/security/summary` | Aggregated risk dashboard. Query `windowDays?, limit?`; returns owned-domain open findings, registrar-lock gaps, DNS drift, trend counts, normalized `riskMetrics`, `riskMetricHistory` from task runs, top risky domains, and recent risk rows. |
| `GET` | `/api/security/findings` | Cursor-paginated DNS/RDAP findings. Query `limit, cursor, status, severity, findingType, domainId`; `findingType` can be a comma-separated list such as `NAMESERVER_DRIFT,MX_DRIFT`. |
| `PATCH` | `/api/security/findings/:id` | Body `{ status, snoozedUntil? }`. Status is `OPEN`, `SNOOZED`, `DISMISSED`, or `RESOLVED`; `SNOOZED` requires `snoozedUntil`. |
| `PATCH` | `/api/security/findings/bulk` | Body `{ ids, status, snoozedUntil? }`. Updates up to 200 findings with the same lifecycle rules as the single-finding endpoint and writes one audit event. |

## Notifications

Risk events are emitted through the same email, webhook, ServerChan, and Web
Push channels as domain events. `SECURITY_FINDING_HIGH` is sent for newly
created high-severity owned-domain findings. It uses metadata `dedupeKey`
values so repeated scans do not fan out the same finding within the dedupe
window.
Risk event presets can disable `email`, `webhook`, `serverchan`, or `push`
before channel-specific filters run. `riskDeliverySummary` includes per-event
channel diagnostics with `presetEnabled`, `configured`, `destinationCount`,
`severity`, and `message`, so operators can see when a preset is enabled but no
matching destination is configured.

### Rules (SMTP / email)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/notifications/config` | Read SMTP, target email, notification toggles, `eventChannelPresets`, and `riskDeliverySummary` with per-channel delivery counts and diagnostics. Secrets are masked. |
| `POST` | `/api/notifications/config` | Upsert SMTP and notification settings. Optional `eventChannelPresets` stores per-channel risk event presets in `app_settings`; writes an audit event. |

### History

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/notifications` | Paginated event log. Query `page, limit, channel, status, eventType, domainId, from, to, archived`; active records are returned by default, `archived=1` shows archived records, and `archived=all` includes both. |
| `GET` | `/api/notifications/:id` | Single event detail. |
| `POST` | `/api/notifications/archive` | Archive active notification events by explicit `ids` or by filters `{ status?, channel?, eventType?, domainId?, from?, to? }`; default status filter is `FAILED`. Returns `{ archived }`. |
| `POST` | `/api/notifications/clear` | Delete notification events by explicit `ids` or by the same filters as archive. Defaults to active failed records; pass `archived=true` to clear archived records. Returns `{ cleared }`. |
| `POST` | `/api/notifications/:id/retry` | Re-send a failed event through the same channel; writes a new row with `retryOf`. |

## Webhooks

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/webhooks` | List webhook configs with sensitive headers masked. |
| `POST` | `/api/webhooks` | Create a webhook config. Body `method` must be `GET`, `POST`, `PUT`, or `PATCH`; `url` must use `http` or `https`; private/reserved targets are blocked unless `ALLOW_PRIVATE_WEBHOOK_TARGETS=true`; `eventTypes` is normalized to canonical uppercase event names; an empty list means all events. |
| `DELETE` | `/api/webhooks/:id` | Delete a webhook config. |
| `POST` | `/api/webhooks/:id/test` | Send a test webhook. Redirects are not followed, and the same URL policy applies. |

## ServerChan

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/serverchan` | List ServerChan configs with SendKey masked and delivery `options` (`channel`, `noip`, `openid`, `tags`, `titlePrefix`, `timeoutMs`). |
| `POST` | `/api/serverchan` | Create a ServerChan config. Body `eventTypes` is normalized to canonical uppercase event names; an empty list means all events. Optional `options` maps to ServerChan Turbo send fields. |
| `PATCH` | `/api/serverchan/:id` | Update name, enabled state, event filters, SendKey (when supplied), and delivery options. |
| `DELETE` | `/api/serverchan/:id` | Delete a ServerChan config. |
| `POST` | `/api/serverchan/:id/test` | Send a test ServerChan message. |

## Web Push

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/push/vapid-public` | Returns `{ publicKey, configured }` for client subscription. |
| `POST` | `/api/push/subscribe` | Body `{ endpoint, keys: { p256dh, auth }, userAgent? }`. Idempotent: refreshes keys and re-enables existing endpoints. |
| `DELETE` | `/api/push/subscribe` | Body `{ endpoint }`. Removes the subscription and writes an audit event. |

## Saved Filters

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/filters` | List saved filter presets, default first. Query `scope` defaults to `domains`. Current scopes include `domains` and `security-findings`. |
| `POST` | `/api/filters` | Body `{ name, criteria, scope?, isDefault? }`; `scope` is stored in `criteria_json._scope`; `isDefault=true` demotes other defaults in the same scope. |
| `PATCH` | `/api/filters/:id` | Update name, criteria, scope, or default flag. Default demotion is scoped. |
| `DELETE` | `/api/filters/:id` | Delete a saved filter. |

## SSL

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/ssl` | Latest SSL snapshot list. |
| `POST` | `/api/ssl/:id/check` | Force-rescan a single domain by id. |
| `POST` | `/api/ssl/check-all` | Scan SSL for active `OWNED` domains in batches of three; pass `?includeWanted=true` to include `WANTED` domains. Returns `{ checked, failed, errors }` and writes an audit event. |

## Costs

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/costs` | List cost rows. |
| `POST` | `/api/costs` | Add a cost row for registration, renewal, transfer, privacy, or other. |
| `DELETE` | `/api/costs/:id` | Remove a cost row. |
| `GET` | `/api/costs/summary` | Aggregations by total, type, domain, and month, using the configured display currency. |

## Settings

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/settings/preferences` | Returns `{ costCurrency, supportedCostCurrencies }`. |
| `POST` | `/api/settings/preferences` | Body `{ costCurrency }`; validates supported currencies, persists to `app_settings`, and writes an audit event. |

## Tasks

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/tasks/runs` | Recent `task_runs` rows plus currently held task locks. Query `limit, cursor`. |
| `POST` | `/api/tasks/trigger` | Body `{ task: 'hourly-scan' | 'daily-summary' }`; queues the task in the background and writes an audit event. |
