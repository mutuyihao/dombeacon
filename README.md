# DomBeacon (域灯)

DomBeacon (域灯) is a self-hosted domain ops beacon for tracking wanted domain opportunities, managing owned domain portfolios, monitoring expiration and SSL risks, and turning domain events into actionable alerts.

## Features

- **Opportunity Tracking**: Monitor wanted domains for availability, expiration, and deletion opportunities
- **Portfolio Management**: Track owned domains with status, expiration, and health monitoring
- **Action Queue**: Event-driven workflow with open/snooze/dismiss/resolved states
- **Status Monitoring**: Tracks `AVAILABLE`, `REGISTERED`, `EXPIRING`, `PENDING_DELETE` states using RDAP
- **Automated Scanning**: Hourly status checks + Daily summary emails (08:00)
- **Beautiful UI**: Morandi color scheme, card-based layout, mobile responsive
- **Bilingual Support**: Full Chinese (zh-CN) and English (en-US) interface with language switcher
- **Notifications**: Instant alerts on status change + Daily digest
- **Optional Authentication**: Simple password gate for production deployments

## Quick Start (Docker)

1. **Clone & Setup**

   ```bash
   git clone <repo>
   cd dombeacon
   cp .env.example .env
   mkdir data
   ```

2. **Run**

   ```bash
   docker-compose up -d
   ```

3. **Access**
   Open `http://localhost:8080` (Docker default).

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

The database path can be configured via `DATABASE_PATH` environment variable (default: `./data/app.db`). Relative paths are resolved from the process working directory; the parent folder is auto-created on first boot.

### Language / 语言

The application supports both Chinese (中文) and English:

- **Default Language**: Chinese (zh-CN)
- **Switch Language**: Click the language button (中/EN) in the header
- **Persistence**: Language preference is saved in a cookie

应用支持中英文双语：

- **默认语言**：中文
- **切换语言**：点击页面顶部的语言按钮（中/EN）
- **持久化**：语言偏好保存在 Cookie 中

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

See [docs/README.md](docs/README.md) for the docs index and [docs/api.md](docs/api.md) for the endpoint list.

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
   Open `http://localhost:3000` (dev).

## Tech Stack

- **Framework**: Nuxt 4 (Vue 3 + Nitro)
- **Database**: SQLite (via Drizzle ORM)
- **Styling**: Tailwind CSS (Custom Morandi Tokens)
- **i18n**: @nuxtjs/i18n (Chinese & English)
- **Scheduling**: Node-Cron + DB Locks
- **Email**: Nodemailer

## License

MIT
