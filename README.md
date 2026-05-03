# Domain Ops Radar

A self-hosted Domain Ops Radar for tracking wanted domain opportunities, managing owned domain portfolios, monitoring expiration and SSL risks, and turning domain events into actionable alerts.

## Features

- **Opportunity Tracking**: Monitor wanted domains for availability, expiration, and deletion opportunities
- **Portfolio Management**: Track owned domains with status, expiration, and health monitoring
- **Action Queue**: Event-driven workflow with open/snooze/dismiss/resolved states
- **Status Monitoring**: Tracks `AVAILABLE`, `REGISTERED`, `EXPIRING`, `PENDING_DELETE` states using RDAP
- **Automated Scanning**: Hourly status checks + Daily summary emails (08:00)
- **Beautiful UI**: Morandi color scheme, card-based layout, mobile responsive
- **Notifications**: Instant alerts on status change + Daily digest
- **Optional Authentication**: Simple password gate for production deployments

## Quick Start (Docker)

1. **Clone & Setup**

   ```bash
   git clone <repo>
   cd domain-ops-radar
   cp .env.example .env
   mkdir data
   ```

2. **Run**

   ```bash
   docker-compose up -d
   ```

3. **Access**
   Open `http://localhost:3000`.

## Configuration

### Authentication (Optional)

Set `ADMIN_PASSWORD` in your `.env` file to enable password protection:

```env
ADMIN_PASSWORD=your-secure-password
```

If not set, the app is publicly accessible.

### SMTP & Notifications

Go to `/settings` to configure:
- Email provider (Gmail, SMTP2GO, etc.)
- Target email address
- Notification rules (Instant alerts, Daily summary)

### Database

The database path can be configured via `DATABASE_PATH` environment variable (default: `./data/domains.db`).

## Usage

### Adding Domains

1. Navigate to `/domains`
2. Click "Add Domain"
3. Select:
   - **Watch Kind**: OWNED (domains you own) or WANTED (domains you're tracking)
   - **Priority**: HIGH, MEDIUM, or LOW
4. Add optional notes and tags

### Managing Actions

The action queue (`/actions`) shows events requiring attention:

- **WANTED_AVAILABLE**: A wanted domain became available
- **WANTED_DROPPING**: A wanted domain is in pending delete/redemption
- **OWNED_EXPIRING**: An owned domain is expiring soon (<30 days)
- **SCAN_FAILED**: RDAP scan failed for a domain

Actions can be:
- **Snoozed**: Temporarily hidden until a future date
- **Dismissed**: Acknowledged but no action needed
- **Resolved**: Action completed

### API Access

See [docs/README.md](docs/README.md) for full API documentation.

## Development Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Database Setup**

   ```bash
   npx drizzle-kit push
   ```

3. **Run Dev Server**
   ```bash
   npm run dev
   ```

## Tech Stack

- **Framework**: Nuxt 3 (Vue 3 + Nitro)
- **Database**: SQLite (via Drizzle ORM)
- **Styling**: Tailwind CSS (Custom Morandi Tokens)
- **Scheduling**: Node-Cron + DB Locks
- **Email**: Nodemailer

## License

MIT
