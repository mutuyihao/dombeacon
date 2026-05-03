# Database Migration Instructions

## Issue

The `better-sqlite3` native module needs to be rebuilt for Node.js v24.13.0, but Visual Studio build tools are not available in the current environment.

## Solution Options

### Option 1: Use Docker (Recommended)

The Docker container has the correct Node version and pre-compiled binaries:

```bash
docker-compose up -d
```

The migration will be applied automatically when the container starts.

### Option 2: Manual Migration (If not using Docker)

If you're running locally and encounter the better-sqlite3 error:

1. Install Visual Studio Build Tools or use a Node version that matches the pre-compiled binaries
2. Run: `npm rebuild better-sqlite3`
3. Apply migration: `node server/scripts/migrate.mjs`

### Option 3: Manual SQL Execution

If you have sqlite3 CLI installed:

```bash
sqlite3 data/domains.db < server/db/migrations/0001_add_watchkind_priority_actions.sql
```

## Migration File

The migration SQL is located at:
`server/db/migrations/0001_add_watchkind_priority_actions.sql`

It adds:
- `watch_kind` and `priority` columns to `domains` table
- `last_error` and `last_error_at` columns to `domain_status_latest` table
- New `actions` table with indexes

## Verification

After migration, verify the schema:

```sql
.schema domains
.schema domain_status_latest
.schema actions
```

Expected columns:
- `domains`: should have `watch_kind` and `priority`
- `domain_status_latest`: should have `last_error` and `last_error_at`
- `actions`: should exist with all columns
