# Domain Ops Radar Documentation

## Product Positioning

### English

**Domain Ops Radar** is a self-hosted Domain Ops Radar for tracking wanted domain opportunities, managing owned domain portfolios, monitoring expiration and SSL risks, and turning domain events into actionable alerts.

It's designed for:
- Individual domain investors tracking opportunities
- Small teams managing domain portfolios
- Technical domain investors who want self-hosted control
- Internal asset maintainers tracking company domains

### 中文

**Domain Ops Radar（域名运营雷达）** 是一个自托管的域名机会与资产健康雷达，帮助你追踪想要的域名、管理已拥有域名、监控到期与 SSL 风险，并通过邮件、Webhook、Server酱等渠道提醒你今天该处理什么。

适用于：
- 追踪域名机会的个人投资者
- 管理域名组合的小团队
- 需要自托管控制的技术型域名投资者
- 追踪公司域名的内部资产维护者

---

## Core Concepts

### Wanted vs Owned

**Wanted Domains** (想要的域名):
- Domains you're interested in acquiring
- Monitor for: availability, expiration, pending delete status
- Action triggers: becomes available, enters redemption period

**Owned Domains** (已拥有的域名):
- Domains you currently own or manage
- Monitor for: expiration dates, registrar changes, SSL certificate health
- Action triggers: approaching expiration, certificate expiring

### Priority Levels

- **HIGH**: Critical domains requiring immediate attention
- **MEDIUM**: Standard monitoring priority
- **LOW**: Background monitoring, less urgent

### Action Queue

The action queue is the heart of Domain Ops Radar. Instead of just showing status, it creates actionable items:

- **OPEN**: New action requiring attention
- **SNOOZED**: Temporarily dismissed until a future date
- **DISMISSED**: Acknowledged but no action needed
- **RESOLVED**: Action completed

### Action Types

- `WANTED_AVAILABLE`: A wanted domain became available
- `WANTED_DROPPING`: A wanted domain is in pending delete/redemption
- `OWNED_EXPIRING`: An owned domain is approaching expiration (<30 days)
- `SCAN_FAILED`: RDAP scan failed for a domain

---

## Architecture Overview

### Technology Stack

- **Frontend**: Nuxt 4 (Vue 3) with Tailwind CSS v4
- **Backend**: Nitro server (Nuxt's server engine)
- **Database**: SQLite with Drizzle ORM
- **Scheduling**: node-cron for periodic tasks
- **Notifications**: Nodemailer (SMTP), Webhook, Server酱
- **Data Source**: RDAP (ICANN's modern WHOIS replacement)

### Data Model

**Core Tables**:
- `domains`: Domain records with watchKind, priority, tags, groups
- `domainStatusLatest`: Current status snapshot
- `domainStatusHistory`: Historical status changes
- `actions`: Action queue items
- `notificationRules`: Notification configuration
- `taskLocks`: Distributed task locking
- `taskRuns`: Task execution history

### Workflow

1. **Hourly Scan**: RDAP scanner checks all active domains
2. **Status Detection**: Compares new status with previous
3. **Action Creation**: Generates actions based on status changes
4. **Notification**: Sends alerts via configured channels
5. **User Action**: User snoozes, dismisses, or resolves actions

---

## Deployment

### Docker (Recommended)

```bash
docker-compose up -d
```

### Manual

```bash
npm install
npx drizzle-kit push
npm run build
npm run preview
```

### Environment Variables

```env
# Authentication (optional)
ADMIN_PASSWORD=your-secure-password

# Database
DATABASE_PATH=./data/domains.db

# SMTP (configured via UI)
# See /settings page
```

---

## Roadmap

### v1.0 (Current Phase)
- ✅ RDAP scanning
- ✅ Action queue system
- ✅ SMTP notifications
- ✅ Optional authentication
- ⏳ Bilingual support (Phase 3)
- ⏳ Webhook notifications (Phase 4)
- ⏳ Server酱 integration (Phase 4)

### v1.1 (Planned)
- SSL certificate monitoring
- CSV import/export
- Renewal cost tracking
- PWA/Mobile optimization
- Action-first dashboard redesign

### v2.0 (Future)
- Registrar read-only sync
- Cost trend analysis
- TLD support matrix
- WHOIS fallback for selected TLDs
- Notification plugin ecosystem

---

## Contributing

This is a self-hosted tool designed for individual use. Contributions are welcome via pull requests.

## License

MIT
