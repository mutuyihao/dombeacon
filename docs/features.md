# Features Reference

Compact, lookup-oriented reference. Each feature lists the DB tables it
touches, the key endpoints, and the source files most people need when
debugging or extending. For richer narratives, the `_archive/` folder
preserves the original implementation write-ups.

## Domain tracking & RDAP scan

- **What it does**: Stores a watch list of domains (OWNED or WANTED), runs
  hourly RDAP scans, and emits actions when status transitions matter.
- **Tables**: `domains`, `domainStatusLatest`, `domainStatusHistory`,
  `actions`, `taskLocks`, `taskRuns`.
- **Endpoints**: `/api/domains*`, `/api/actions*`, `/api/tasks/*`.
- **Key files**: `server/utils/scanner.ts` (RDAP), `server/utils/tasks.ts`
  (`runDomainScan`, batched 5-wide concurrency), `server/utils/actions.ts`
  (dedup + auto-resolve), `pages/domains/index.vue`.

## Email / SMTP notifications

- **What**: Instant alerts on status change + 08:00 daily summary, with
  in-app dedup window.
- **Tables**: `notificationRules`, `notificationEvents`.
- **Endpoints**: `/api/notifications/config` (GET/POST).
- **Key files**: `server/utils/mail.ts` (`sendNotification`,
  `wasRecentlySent`, `getTemplate`), `pages/settings.vue`.

## Webhook fan-out

- **What**: Per-event POST/GET to user-configured URLs with custom headers
  and per-event-type filtering.
- **Tables**: `webhookConfigs`, `notificationEvents` (channel='WEBHOOK').
- **Endpoints**: `/api/webhooks*`, `/api/webhooks/:id/test`.
- **Key files**: `server/utils/webhook.ts` (`notifyWebhooks`,
  `sendWebhook`), `pages/webhooks.vue`, `components/WebhookModal.vue`.

## Server酱 (WeChat) integration

- **What**: WeChat push via Server酱's Markdown HTTP API, masked SendKey,
  per-event-type opt-in.
- **Tables**: `serverchanConfigs`, `notificationEvents` (channel='SERVERCHAN').
- **Endpoints**: `/api/serverchan*`, `/api/serverchan/:id/test`.
- **Key files**: `server/utils/serverchan.ts` (`notifyServerchan`,
  `formatServerchanMessage`, `sendServerchan`), `pages/serverchan.vue`,
  `components/ServerchanModal.vue`.

## Web Push (PWA) — v1.2

- **What**: Browser push notifications via VAPID. Hand-rolled service
  worker handles `push` + `notificationclick`.
- **Tables**: `pushSubscriptions`, `notificationEvents` (channel='PUSH').
- **Endpoints**: `/api/push/vapid-public` (GET),
  `/api/push/subscribe` (POST/DELETE).
- **Key files**: `server/utils/push.ts` (`notifyPush`, `formatPushPayload`,
  `sendWebPush`), `composables/usePushSubscription.ts`,
  `plugins/pwa.client.ts`, `public/sw.js`, `public/manifest.webmanifest`,
  `pages/settings.vue` (push toggle).
- **Setup**: see [pwa-and-push.md](pwa-and-push.md).

## Notification history & retry — v1.2

- **What**: Full audit log of every send attempt (every channel),
  filterable + paginated, with one-click retry that writes a new
  `retryOf` row instead of mutating the original.
- **Tables**: `notificationEvents` (with `retryOf` foreign-key-style
  pointer added in migration `0002`).
- **Endpoints**: `/api/notifications` (GET list),
  `/api/notifications/:id` (GET detail), `/api/notifications/:id/retry`
  (POST).
- **Key files**: `pages/notifications.vue`,
  `components/NotificationDetailModal.vue`,
  `server/api/notifications/index.get.ts`,
  `server/api/notifications/[id]/retry.post.ts`.

## Advanced filtering — v1.2

- **What**: 8-dimension filter (search / status / watchKind / priority /
  group / tags[] / sslState / expiringDays), URL-synced for shareable
  deep-links, savable presets with a default-on-load preset.
- **Tables**: `savedFilters`.
- **Endpoints**: `/api/filters*`, plus extended query parameters on
  `/api/domains` (`tags`, `sslState`, `expiringDays`).
- **Key files**: `composables/useFilterState.ts` (URL ↔ criteria sync),
  `components/FilterPanel.vue` (collapsible UI + chip list),
  `pages/domains/index.vue` (saved filters dropdown + tabs as quick
  shortcuts), `server/api/filters/*.ts`,
  `server/api/domains/index.get.ts` (extended where-builder).

## SSL certificate monitoring

- **What**: For OWNED domains, fetches the live cert via TLS handshake,
  records issuer / validFrom / validTo / daysUntilExpiry, and emits
  `SSL_EXPIRING` (<30d) or `SSL_INVALID` actions.
- **Tables**: `sslStatusLatest`, `sslStatusHistory`.
- **Endpoints**: `/api/ssl`, `/api/ssl/:id/check`.
- **Key files**: `server/utils/ssl.ts` (`scanDomainSSL`),
  `pages/ssl.vue`, called from `runDomainScan` in
  `server/utils/tasks.ts`.

## Cost tracking

- **What**: Per-domain expense ledger across registration / renewal /
  transfer / privacy / other, multi-currency, with annual / monthly /
  by-type / by-domain summaries.
- **Tables**: `domainCosts`, `domainBudgets` (budgets schema is in
  place; UI surfaces totals only).
- **Endpoints**: `/api/costs*`, `/api/costs/summary`.
- **Key files**: `pages/costs.vue`, `components/CostModal.vue`,
  `server/api/costs/*.ts`.

## CSV import / export

- **What**: Round-trip of the domain list (with tags using `;` separator,
  optional update-existing on import).
- **Endpoints**: `POST /api/domains/import`, `GET /api/domains/export`.
- **Key files**: `pages/import.vue`, `server/api/domains/import.post.ts`,
  `server/api/domains/export.get.ts`.

## i18n (zh-CN ↔ en-US)

- **What**: Full bilingual UI via `@nuxtjs/i18n`. Language preference
  saved in cookie. zh-CN is the default.
- **Key files**: `i18n/locales/zh-CN.json`, `i18n/locales/en-US.json`,
  `nuxt.config.ts` (module config), header toggle in
  `components/AppHeader.vue`.

## UI / design system

- Morandi-tone palette defined as CSS variables in
  `assets/css/main.css` (Tailwind v4 `@theme`).
- Reusable components: `Toast`, `ConfirmDialog`, `LoadingSpinner`,
  `DomainCard`, headless-UI `Dialog`-based modals (`*Modal.vue`).
- Toast composable: `composables/useToast.ts`.
- Header / nav: `components/AppHeader.vue` (includes the v1.2 PWA install
  button via `beforeinstallprompt`).
