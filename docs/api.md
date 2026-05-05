# API Reference

All endpoints live under Nuxt Nitro at `server/api/*` and respond with the
unified shape:

```json
{ "code": 0, "msg": "OK", "data": ... }
```

`code === 0` means success; any other value is a logical error (HTTP
status is generally 200 even for logical errors so that clients can read
the body uniformly). See `server/utils/api.ts`.

## Base URL

| Environment | URL |
|---|---|
| Docker (default `docker-compose.yml`) | `http://localhost:8080` |
| Local dev (`npm run dev`) | `http://localhost:3000` |

## Authentication

If `ADMIN_PASSWORD` is set, `/api/auth/login` issues an HttpOnly session
cookie, and most pages + API routes require it. With no password set,
auth is disabled.

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/auth/login` | Body: `{ password }` |
| `POST` | `/api/auth/logout` | Clears session cookie |
| `GET`  | `/api/auth/status` | `{ authRequired, authenticated }` |

## Domains

| Method | Path | Notes |
|---|---|---|
| `GET`    | `/api/domains` | List + filter. Query: `page, limit, search, status, watchKind, priority, group, tag, tags (comma-separated), sslState (expiring/invalid/none), expiringDays`. Returns `{ items, total, page, limit }`. |
| `POST`   | `/api/domains` | Create |
| `GET`    | `/api/domains/:id` | Detail |
| `PUT`    | `/api/domains/:id` | Update |
| `DELETE` | `/api/domains/:id` | Delete |
| `POST`   | `/api/domains/:id/refresh` | Trigger immediate RDAP+SSL scan |
| `POST`   | `/api/domains/import` | CSV import (multipart) |
| `GET`    | `/api/domains/export` | CSV export |

## Actions

| Method | Path | Notes |
|---|---|---|
| `GET`   | `/api/actions` | Action queue with embedded domain info |
| `POST`  | `/api/actions` | Manual action create |
| `PATCH` | `/api/actions/:id` | Snooze / dismiss / resolve |

## Notifications

### Rules (SMTP / email)

| Method | Path | Notes |
|---|---|---|
| `GET`  | `/api/notifications/config` | Read SMTP + targetEmail + toggles |
| `POST` | `/api/notifications/config` | Upsert config |

### History (v1.2)

| Method | Path | Notes |
|---|---|---|
| `GET`  | `/api/notifications` | Paginated event log. Query: `page, limit, channel, status, eventType, domainId, from, to`. Returns `{ items, total, page, limit }` joined to domain name. |
| `GET`  | `/api/notifications/:id` | Single event detail |
| `POST` | `/api/notifications/:id/retry` | Re-send a `FAILED` event via the same channel; writes a new row with `retryOf` set to the original id |

## Webhooks

| Method | Path |
|---|---|
| `GET`    | `/api/webhooks` |
| `POST`   | `/api/webhooks` |
| `DELETE` | `/api/webhooks/:id` |
| `POST`   | `/api/webhooks/:id/test` |

## Server酱

| Method | Path |
|---|---|
| `GET`    | `/api/serverchan` |
| `POST`   | `/api/serverchan` |
| `DELETE` | `/api/serverchan/:id` |
| `POST`   | `/api/serverchan/:id/test` |

## Web Push (v1.2)

| Method | Path | Notes |
|---|---|---|
| `GET`    | `/api/push/vapid-public` | Returns `{ publicKey, configured }` for the client to subscribe |
| `POST`   | `/api/push/subscribe` | Body `{ endpoint, keys: { p256dh, auth }, userAgent? }`. Idempotent: refreshes keys + re-enables on existing endpoints. |
| `DELETE` | `/api/push/subscribe` | Body `{ endpoint }`. Removes the subscription. |

## Saved Filters (v1.2)

| Method | Path | Notes |
|---|---|---|
| `GET`    | `/api/filters` | List, default first |
| `POST`   | `/api/filters` | Body `{ name, criteria, isDefault? }`. Setting `isDefault=true` demotes others. |
| `PATCH`  | `/api/filters/:id` | Update name / criteria / isDefault |
| `DELETE` | `/api/filters/:id` | Delete |

## SSL

| Method | Path | Notes |
|---|---|---|
| `GET`  | `/api/ssl` | Latest snapshot list |
| `POST` | `/api/ssl/:id/check` | Force-rescan a single domain |

## Costs

| Method | Path | Notes |
|---|---|---|
| `GET`    | `/api/costs` | List all cost rows |
| `POST`   | `/api/costs` | Add cost (registration / renewal / transfer / privacy / other) |
| `DELETE` | `/api/costs/:id` | Remove |
| `GET`    | `/api/costs/summary` | Aggregations (totals, byType, byDomain, byMonth) |

## Tasks

| Method | Path | Notes |
|---|---|---|
| `GET`  | `/api/tasks/runs` | Recent `taskRuns` rows |
| `POST` | `/api/tasks/trigger` | Body `{ task: 'hourly-scan' \| 'daily-summary' }` |
