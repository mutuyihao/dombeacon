# Domain Watchlist

A self-hosted, aesthetically pleasing domain status monitoring system built with Nuxt 3, SQLite, and SMTP notifications. Designed for domain investors and brand protection.

## Features

- **Status Monitoring**: Tracks `AVAILABLE`, `REGISTERED`, `EXPIRING`, `DROPPING` states using RDAP/WHOIS.
- **Automated Scanning**: Hourly status checks + Daily summary emails (08:00).
- **Beautiful UI**: Morandi color scheme, card-based layout, mobile responsive.
- **Notifications**: Instant alerts on status change + Daily digest.
- **No Auth**: Simplified open-access design for internal networks.

## Quick Start (Docker)

1. **Clone & Setup**

   ```bash
   git clone <repo>
   cd domainwatchlist
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
