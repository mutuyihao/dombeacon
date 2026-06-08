# DomBeacon

DomBeacon is a self-hosted domain ops beacon for tracking wanted domain
opportunities, managing owned domain portfolios, monitoring domain/SSL/DNS
risks, and detecting brand-abuse candidates through RDAP and public
Certificate Transparency data.

## Features

- **Domain tracking**: Monitor `WANTED` domains for availability and dropping
  signals, and `OWNED` domains for expiry and operational health.
- **RDAP status history**: Store latest and historical RDAP snapshots using
  ICANN RDAP bootstrap discovery.
- **Action queue**: Convert meaningful events into open, snoozed, dismissed,
  or resolved work items.
- **SSL monitoring**: Track certificate issuer, validity window, invalid
  chains, and certificates expiring in fewer than 30 days.
- **DNS/RDAP security findings**: Track DNS posture, nameserver/MX drift,
  SPF/DMARC/CAA/DNSSEC signals, and registrar-lock gaps with bulk triage,
  saved queue views, and keyboard shortcuts.
- **Brand Watch**: Generate exact, typo, prefix/suffix, and homoglyph
  lookalikes; check them through RDAP; discover CT-observed domains from
  crt.sh; and review persisted risks.
- **Notifications**: Send events through email, webhooks, ServerChan, and Web
  Push, with risk event channel presets, delivery history, and retry support.
- **Audit logs**: Record admin login, config changes, domain mutations, scans,
  finding updates, and Brand Watch changes.
- **Cost tracking**: Store per-domain costs and choose the display currency in
  settings preferences.
- **PWA support**: Installable UI with a hand-rolled service worker and Web
  Push subscription flow.

## Quick Start (Docker)

1. Clone and prepare the workspace.

   ```bash
   git clone <repo>
   cd dombeacon
   cp .env.example .env
   mkdir data
   ```

2. Set required secrets in `.env`.

   ```env
   ADMIN_PASSWORD=your-secure-password
   SESSION_SECRET=your-random-session-secret
   SECRET_ENCRYPTION_KEY=your-random-storage-secret
   ```

3. Run the app.

   ```bash
   docker-compose up -d
   ```

4. Open `http://localhost:8080`.

## Configuration

### Authentication

`ADMIN_PASSWORD` is required for normal deployments. Authentication is disabled
only when `AUTH_DISABLED=true` is set explicitly.

Set `TRUST_PROXY_HEADERS=true` only when the app is behind a trusted reverse
proxy that controls `X-Forwarded-For`.

`SECRET_ENCRYPTION_KEY` is used to encrypt stored SMTP, webhook, ServerChan,
and push subscription secrets. If omitted, DomBeacon falls back to
`SESSION_SECRET` or `ADMIN_PASSWORD`.

### Database

The database path is controlled by `DATABASE_PATH` and defaults to
`./data/app.db`. Relative paths are resolved from the process working
directory, and the parent folder is auto-created on first boot.

### Scheduler

The built-in scheduler is enabled by default. It runs:

- Hourly domain scans.
- Hourly Brand Watch scans for enabled due terms.
- Daily summary at 08:00 in the configured scheduler timezone.

Use `ENABLE_SCHEDULER=false` to disable background jobs. Use
`SCHEDULER_TIMEZONE=Asia/Shanghai` or another IANA timezone to control local
wall-clock scheduling.

### Notifications

Use the app settings pages to configure SMTP, webhooks, ServerChan, and Web
Push. VAPID keys are required for Web Push; see
[docs/pwa-and-push.md](docs/pwa-and-push.md).

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
- `SCAN_FAILED`: a RDAP scan failed.

Actions can be snoozed, dismissed, or resolved.

### Brand Watch

Go to `/brand-watch` to configure brand, product, or company terms. DomBeacon
generates local candidates, probes them with RDAP, queries crt.sh for
CT-observed domains containing the watched term, and persists reviewable risks.

### Security Findings

Use `/ops/security` for the aggregate risk dashboard and `/ops/findings` for
the triage queue. The queue supports URL filters, saved `security-findings`
views, visible-row bulk lifecycle updates, and keyboard triage shortcuts:
`J/K` move, `X` select, `R` reopen, `S` snooze, `D` dismiss, and `E` resolve.

## API and Docs

See [docs/README.md](docs/README.md) for the documentation index,
[docs/api.md](docs/api.md) for endpoint details, and
[docs/development/product-roadmap.md](docs/development/product-roadmap.md) for
the current product plan.

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
