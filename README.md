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

- **SMTP**: Go to `/settings` to configure your email provider (Gmail, SMTP2GO, etc.) and target email.
- **Rules**: Toggle "Instant Notification" or "Daily Summary" in Settings.

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
