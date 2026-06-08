# Schema Migrations

The project uses Drizzle ORM. Schema definitions live in
[../../server/db/schema.ts](../../server/db/schema.ts); SQL migrations live in
[../../server/db/migrations/](../../server/db/migrations/).

## Day-to-day Usage

```bash
pnpm exec drizzle-kit push
```

`drizzle-kit` reads `DATABASE_PATH` from `.env` via the inline loader in
[../../drizzle.config.ts](../../drizzle.config.ts). The default is
`./data/app.db`.

Runtime uses `server/utils/db.ts`, which opens `DATABASE_PATH` through
`better-sqlite3`, applies SQLite PRAGMAs, creates the parent directory when
needed, and runs compatibility DDL for additive tables/columns/indexes.

## Migration Files

| File | Purpose |
|---|---|
| `0000_dashing_human_torch.sql` | Initial schema: domains, latest/history status, actions, notification rules/events, task locks. |
| `0001_add_watchkind_priority_actions.sql` | Adds `watch_kind` and `priority` to `domains`, last-error fields to latest status, and action workflow fields. |
| `0002_v12_indexes_pwa.sql` | Adds performance indexes, `notification_events.retry_of`, `push_subscriptions`, and `saved_filters`. |
| `0003_ssl_checker_metadata.sql` | Adds SSL checked-host and validation-error metadata. |
| `0004_audit_logs.sql` | Adds `audit_logs` for admin login, config changes, domain mutations, scans, and review actions. |
| `0005_security_findings_dns.sql` | Adds `dns_snapshots` and `risk_findings` for owned-domain DNS/RDAP posture. |
| `0006_brand_watch_terms.sql` | Adds `brand_watch_terms` and `brand_watch_candidates` for Brand Watch RDAP and CT candidate results. |
| `0007_brand_watch_candidate_review.sql` | Adds manual Brand Watch candidate review state, notes, reviewer metadata, and review-state index. |

The v1.2 migrations are additive: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX
IF NOT EXISTS`, and additive `ALTER TABLE ADD COLUMN`. They are safe to apply
on top of v1.0 or v1.1 databases.

## Runtime Compatibility Tables

`server/utils/db.ts` also creates additive runtime compatibility structures so
older local databases can start even before a manual Drizzle push:

- `app_settings`: key/value runtime preferences. Currently used for cost
  currency via `GET|POST /api/settings/preferences` and risk notification
  channel presets via `GET|POST /api/notifications/config`.
- `audit_logs`: admin audit stream.
- `dns_snapshots` and `risk_findings`: owned-domain security posture.
- `brand_watch_terms` and `brand_watch_candidates`: Brand Watch terms and
  persisted candidate results.

This compatibility path is intentionally additive. It must not drop columns or
rewrite existing data.

## Brand Watch Candidate Storage

`brand_watch_candidates` stores both RDAP and CT findings:

- `source='rdap'`: locally generated candidate was checked through RDAP.
- `source='ct'`: domain was observed in crt.sh Certificate Transparency data.
- `evidence_json`: source-specific details such as RDAP URL/statuses or CT
  matched names, certificate ids, issuer names, and timestamps.
- `review_status`, `review_note`, `reviewed_at`, `reviewed_by`: manual triage
  metadata that is not overwritten by subsequent RDAP or CT scans.

CT does not require a separate table. This keeps triage and filtering on one
candidate list while preserving source details.

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

Expected post-v1.2 tables include `app_settings`, `push_subscriptions`,
`saved_filters`, `audit_logs`, `dns_snapshots`, `risk_findings`,
`brand_watch_terms`, `brand_watch_candidates`, and `notification_events.retry_of`.
