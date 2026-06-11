# Schema Migrations

The project uses Drizzle ORM. Schema definitions live in
[../../server/db/schema.ts](../../server/db/schema.ts); SQL migrations live in
[../../server/db/migrations/](../../server/db/migrations/).

## Current Model

The migration history has been reset to a single current baseline:

| File | Purpose |
|---|---|
| `0000_pretty_jazinda.sql` | Creates the complete current schema for domains, RDAP/SSL history, actions, audit logs, DNS risk findings, notifications, saved filters, app settings, cost tracking, task locks/runs, Web Push, webhooks, and ServerChan configs. |

Old incremental migrations, auth tables/routes, and the archived brand-watch
prototype schema are not part of the current product surface.

## Day-to-day Usage

```bash
pnpm exec drizzle-kit push
```

`drizzle-kit` reads `DATABASE_PATH` from `.env` via the inline loader in
[../../drizzle.config.ts](../../drizzle.config.ts). The default is
`./data/app.db`.

Runtime uses `server/utils/db.ts`, which opens `DATABASE_PATH` through
`better-sqlite3`, applies SQLite PRAGMAs, creates the parent directory when
needed, and applies the checked-in Drizzle migrations from
`server/db/migrations`.

## When Each Path Gets Used

- **Runtime**: Nitro calls `useDb()` from `server/utils/db.ts`.
- **CLI migrations**: `drizzle-kit push` reads `DATABASE_PATH` from `.env`.
- **Docker**: `docker-compose.yml` sets `DATABASE_PATH=/app/data/app.db`, and
  `./data:/app/data` keeps SQLite data on the host.

## Native Module Note

`better-sqlite3` ships native binaries. If you hit a
`NODE_MODULE_VERSION mismatch`, use the Docker image or match your local Node
version to the project runtime and rebuild `better-sqlite3`.

## Verification

```bash
sqlite3 ./data/app.db ".schema domains"
sqlite3 ./data/app.db ".schema notification_events"
sqlite3 ./data/app.db ".tables"
```

Expected current tables include `domains`, `domain_status_latest`,
`domain_status_history`, `ssl_status_latest`, `ssl_status_history`, `actions`,
`notification_events`, `notification_rules`, `push_subscriptions`,
`saved_filters`, `audit_logs`, `dns_snapshots`, `risk_findings`,
`app_settings`, `domain_costs`, `domain_budgets`, `task_locks`, `task_runs`,
`webhook_configs`, and `serverchan_configs`.
