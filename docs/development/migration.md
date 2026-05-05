# Schema Migrations

The project uses Drizzle ORM. Schema definitions live in
[../../server/db/schema.ts](../../server/db/schema.ts); SQL migrations
live in [../../server/db/migrations/](../../server/db/migrations/).

## Day-to-day usage

```bash
# Apply schema directly (creates DB if missing, idempotent for new columns/indexes)
npx drizzle-kit push
```

`drizzle-kit` reads `DATABASE_PATH` from `.env` via the inline loader in
[../../drizzle.config.ts](../../drizzle.config.ts). Defaults to
`./data/app.db`. Parent directory is auto-created at runtime by
`server/utils/db.ts`.

## Migration files

| File | Purpose |
|---|---|
| `0000_dashing_human_torch.sql` | Initial schema (v1.0): domains, status, actions, notification_rules, notification_events, task locks |
| `0001_add_watchkind_priority_actions.sql` | v1.1: adds `watch_kind` + `priority` to `domains`, `last_error` columns to `domain_status_latest`, and the `actions` table |
| `0002_v12_indexes_pwa.sql` | v1.2: performance indexes across most filtered/sorted columns; `notification_events.retry_of` column; `push_subscriptions` and `saved_filters` tables |

The v1.2 migration is purely additive (CREATE INDEX IF NOT EXISTS,
CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN). It is safe to apply
on top of any v1.0 / v1.1 database.

## When does each path get used?

- **Runtime** (Nitro server): `server/utils/db.ts` opens
  `DATABASE_PATH` via `better-sqlite3`, lazy-initialised on first
  `useDb()` call.
- **CLI migrations** (`drizzle-kit push`): reads `DATABASE_PATH` from
  `.env` so it operates on the same file the runtime will open.
- **Docker**: `docker-compose.yml` sets
  `DATABASE_PATH=/app/data/app.db`; the volume mount
  `./data:/app/data` keeps the SQLite file on the host.

## Native module note (better-sqlite3)

`better-sqlite3` ships prebuilt binaries for the major Node.js LTS
versions. If you hit a `NODE_MODULE_VERSION mismatch` rebuild error on
your local machine, the simplest fixes are:

1. Use the Docker image (binaries baked in) — `docker-compose up -d`.
2. Match your local Node to the version in `.nvmrc` / `Dockerfile`
   (`node:22-alpine` at time of writing) and run `npm rebuild
   better-sqlite3`.

## Verification

```bash
sqlite3 ./data/app.db ".schema domains"
sqlite3 ./data/app.db ".schema notification_events"
sqlite3 ./data/app.db ".tables"
```

Expect (post-v1.2): the two new v1.2 tables (`push_subscriptions`,
`saved_filters`), and a `retry_of` column on `notification_events`.
