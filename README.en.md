# DomBeacon

**Language**: [中文](./README.md) | English

DomBeacon is a self-hosted domain operations beacon for tracking wanted domain opportunities, managing owned domain portfolios, monitoring domain / SSL / DNS risks, and turning important events into actionable alerts.

## Features

- **Domain tracking**: Monitor `WANTED` domains for availability, redemption, and dropping signals; monitor `OWNED` domains for expiry and operational health.
- **RDAP status history**: Store latest and historical RDAP snapshots using ICANN RDAP bootstrap discovery.
- **Action queue**: Convert meaningful events into open, snoozed, dismissed, or resolved work items.
- **SSL monitoring**: Track certificate issuer, validity window, invalid chains, and certificates expiring in fewer than 30 days.
- **DNS / RDAP security findings**: Track DNS posture, nameserver / MX drift, SPF, DMARC, CAA, DNSSEC, and registrar-lock gaps with bulk triage, saved queue views, and keyboard shortcuts.
- **Notifications**: Send events through email, webhooks, ServerChan, and Web Push, with risk event channel presets, delivery history, and retry support.
- **Audit logs**: Record config changes, domain mutations, scans, finding updates, and notification changes.
- **Cost tracking**: Store per-domain costs and choose the display currency in settings preferences.
- **PWA support**: Installable UI with a hand-rolled service worker and Web Push subscription flow.

## Quick Start With Docker

1. Clone the project and prepare the workspace.

   ```bash
   git clone <repo>
   cd dombeacon
   cp .env.example .env
   mkdir data
   ```

2. Set runtime secrets and access control in `.env`.

   ```env
   SECRET_ENCRYPTION_KEY=your-random-storage-secret
   BASIC_AUTH_USERNAME=admin
   BASIC_AUTH_PASSWORD=change-me
   ```

3. Start the app.

   ```bash
   docker-compose up -d
   ```

4. Open `http://localhost:8080`.

## Access Model

DomBeacon is designed for trusted self-hosted deployments. The example `docker-compose.yml` binds to `127.0.0.1:8080` by default.

If you expose it outside localhost, put it behind a VPN or trusted reverse proxy and enable at least one access control layer:

- Configure `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` for Basic Auth.
- Configure `DOMBEACON_API_TOKEN` for Bearer-token access.
- If an outer gateway already performs strong authentication, it can own access control, but keeping app-level auth is still recommended.

## Deployment Notes

DomBeacon currently assumes a single application instance using one SQLite database file. Do not scale the Docker Compose service with `replicas` unless all instances share the same writable database file and scheduler semantics are revisited. For multi-instance deployments, move the datastore and locks to a server database such as PostgreSQL.

Back up the SQLite database by stopping the container or using SQLite online backup tooling, then copying `DATABASE_PATH`, such as `./data/app.db`. Keep the matching `SECRET_ENCRYPTION_KEY`; encrypted notification secrets cannot be recovered without it.

## Configuration

`.env.example` is the complete configuration template. `.env` is local runtime configuration and must not contain committed real secrets.

### Required Variables

| Variable | When it is required | Purpose |
| --- | --- | --- |
| `SECRET_ENCRYPTION_KEY` | Required in production; also required whenever SMTP, Webhook, ServerChan, Web Push, or another feature stores sensitive fields | Encrypts notification secrets, passwords, and subscription credentials stored in the database. This value must remain stable; old encrypted data cannot be decrypted if it is lost |

### Conditionally Required Variables

| Variable | When it is required | Purpose |
| --- | --- | --- |
| `BASIC_AUTH_USERNAME` + `BASIC_AUTH_PASSWORD` | Required when the app is exposed to an untrusted network, unless `DOMBEACON_API_TOKEN` or strong outer authentication is used | Enables Basic Auth. Both variables must be set together |
| `DOMBEACON_API_TOKEN` | Required when the app is exposed to an untrusted network, unless Basic Auth or strong outer authentication is used | Enables Bearer-token access with `Authorization: Bearer <token>` |
| `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` | Required when browser Web Push notifications are used; optional otherwise | VAPID credentials required for Web Push subscriptions and delivery |
| `BASE_URL` | Required for production deployments, reverse-proxy domains, or any email / notification content that needs correct external links | Generates email links, notification body links, and callback URLs |
| `TRUST_PROXY_HEADERS` | Set to `true` only when the app is behind a trusted reverse proxy that overwrites `X-Forwarded-For` / `X-Real-IP` correctly | Affects audit-log client IPs and API rate-limit client identity. Do not enable behind an untrusted proxy |
| `ALLOW_PRIVATE_WEBHOOK_TARGETS` | Set to `true` only when webhooks must be delivered to trusted intranet, loopback, or private addresses | Private targets are blocked by default to reduce SSRF risk |
| `ALLOW_SINGLE_LABEL_DOMAINS` | Set to `true` only when internal single-label hostnames such as `localhost` or `intranet` need monitoring | Domains must contain a dot by default to avoid treating arbitrary strings as public domains |
| `AUTH_PROTECT_HEALTH` | Set to `true` only when `/api/health` should also require app authentication | Health checks are public by default for Docker and reverse-proxy probes |
| `DISABLE_API_RATE_LIMIT` | Set to `true` only when a trusted upstream rate limiter already exists | Disables built-in mutation API rate limiting |

### Optional Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Nuxt / Nitro listening port. The Docker Compose example maps host `8080` to container `3000` |
| `DATABASE_PATH` | `./data/app.db` | SQLite database file path. Relative paths are resolved from the process working directory, and missing directories are created automatically |
| `SQLITE_JOURNAL_MODE` | `DELETE` | SQLite journal mode. `DELETE` has the best compatibility; evaluate `WAL` if you need better concurrent reads / writes |
| `ENABLE_SCHEDULER` | `1` | Enables built-in scheduled jobs. Set to `0` or `false` to disable background scans and daily summaries |
| `SCHEDULER_TIMEZONE` | `UTC` | IANA timezone used by the scheduler, for example `Asia/Shanghai` |
| `SCAN_BATCH_SIZE` | `5` | Number of domains per scan batch. `WANTED` runs RDAP only; `OWNED` also runs SSL and DNS security checks |
| `SCAN_BATCH_DELAY_MS` | `1000` | Delay between scan batches in milliseconds |
| `RATE_LIMIT_MUTATION_WINDOW_MS` | `60000` | Rate-limit window for normal mutation operations in milliseconds |
| `RATE_LIMIT_MUTATION_MAX` | `120` | Maximum normal mutation requests per client per window |
| `RATE_LIMIT_HEAVY_WINDOW_MS` | `300000` | Rate-limit window for heavy operations in milliseconds |
| `RATE_LIMIT_DOMAINS_CREATE_MAX` | `30` | Maximum domain-create requests per client per window |
| `RATE_LIMIT_DOMAINS_IMPORT_MAX` | `5` | Maximum domain-import requests per client per window |
| `RATE_LIMIT_SSL_CHECK_ALL_MAX` | `3` | Maximum full SSL-check requests per client per window |
| `RATE_LIMIT_TASK_TRIGGER_MAX` | `5` | Maximum manual background-task trigger requests per client per window |
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, or `error` |
| `LOG_FORMAT` | `text` | Log format: `text` or `json`. Use `json` for container log collectors or structured logging platforms |

SMTP recipients, host, credentials, and passwords are configured through the UI and encrypted in the database. See [docs/pwa-and-push.md](docs/pwa-and-push.md) for Web Push VAPID key generation.

## Usage

### Adding Domains

1. Navigate to `/domains`.
2. Click "Add Domain".
3. Select `OWNED` for domains you control or `WANTED` for domains you track.
4. Set priority, notes, group, and tags as needed.

### Managing Actions

The action queue shows events requiring attention:

- `WANTED_AVAILABLE`: a wanted domain became registrable.
- `WANTED_DROPPING`: a wanted domain entered redemption or pending-delete.
- `OWNED_EXPIRING`: an owned domain is inside the expiry window.
- `SSL_EXPIRING`: an owned-domain certificate expires soon.
- `SSL_INVALID`: an owned-domain certificate chain is invalid.
- `SCAN_FAILED`: an RDAP scan failed.

Actions can be snoozed, dismissed, or resolved.

### Security Findings

Use `/risk` for the aggregate risk dashboard and `/risk/findings` for the triage queue. The queue supports URL filters, saved `security-findings` views, visible-row bulk lifecycle updates, and keyboard triage shortcuts:

- `J/K`: move up or down.
- `X`: select.
- `R`: reopen.
- `S`: snooze.
- `D`: dismiss.
- `E`: resolve.

## API and Docs

- [docs/README.md](docs/README.md): documentation index.
- [docs/api.md](docs/api.md): endpoint details.
- [docs/development/product-roadmap.md](docs/development/product-roadmap.md): current product plan.

## Development Setup

1. Install dependencies.

   ```bash
   pnpm install
   ```

2. Prepare the database.

   ```bash
   pnpm exec drizzle-kit push
   ```

3. Run the dev server.

   ```bash
   pnpm dev
   ```

4. Open `http://localhost:3000`.

## Verification

```bash
pnpm test
pnpm build
```

## Tech Stack

- Nuxt 4, Vue 3, Nitro
- SQLite, Drizzle ORM, better-sqlite3
- Tailwind CSS v4
- `@nuxtjs/i18n`
- Built-in timezone-aware scheduler with DB locks
- Nodemailer, web-push

## License

MIT
