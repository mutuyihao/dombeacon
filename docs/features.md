# Features Reference

Compact, lookup-oriented reference. Each feature lists the tables it touches,
the key endpoints, and the source files most people need when debugging or
extending. For richer historical narratives, use `docs/_archive/`.

## Domain Tracking and RDAP Scan

- **What**: Store `OWNED` and `WANTED` domains, scan RDAP hourly, preserve
  latest/history rows, and emit actions when state transitions matter.
- **Tables**: `domains`, `domain_status_latest`, `domain_status_history`,
  `actions`, `task_locks`, `task_runs`.
- **Endpoints**: `/api/domains*`, `/api/domains/:id/history`,
  `/api/actions*`, `/api/tasks/*`.
- **Key files**: `server/utils/scanner.ts`, `server/utils/tasks.ts`,
  `server/utils/actions.ts`, `pages/domains/index.vue`,
  `pages/domains/[id].vue`.

## Built-in Scheduler and Tasks

- **What**: Timezone-aware background jobs with DB locks. It runs hourly
  domain scans and an 08:00 daily summary.
- **Tables**: `task_locks`, `task_runs`.
- **Endpoints**: `GET /api/tasks/runs`, `POST /api/tasks/trigger`.
- **Key files**: `server/plugins/scheduler.ts`, `server/utils/schedule.ts`,
  `server/utils/tasks.ts`, `pages/tasks.vue`.
- **Config**: `ENABLE_SCHEDULER=false` disables jobs;
  `SCHEDULER_TIMEZONE` controls local wall-clock scheduling.
- **Risk metrics**: `hourly-scan` and `daily-summary` store
  normalized `riskMetrics` snapshots in `task_runs.result_json`; the Security
  dashboard reuses those rows for sparkline history.

## Audit Logs

- **What**: Audit stream for settings, notification config, domain mutations,
  imports, manual scans, finding updates, and notification changes.
- **Tables**: `audit_logs`.
- **Endpoints**: `GET /api/audit-logs`.
- **Key files**: `server/utils/audit.ts`,
  `server/api/audit-logs/index.get.ts`.

## DNS/RDAP Security Findings

- **What**: Owned-domain posture checks for DNS drift and email/security
  policy signals, plus RDAP registrar-lock findings.
- **Tables**: `dns_snapshots`, `risk_findings`, `domains`.
- **Endpoints**: `GET /api/security/findings`,
  `PATCH /api/security/findings/:id`,
  `PATCH /api/security/findings/bulk`, domain detail risk fields.
- **UI**: `/risk/findings` is the full-page queue. `/risk`
  metric cards and domain rows link into this queue with persisted query
  filters. The queue supports visible-row selection and bulk reopen, snooze,
  dismiss, and resolve actions. Operators can save triage views with scoped
  `saved_filters` entries under `security-findings`; default triage views apply
  only when the page is opened without query filters. Keyboard triage shortcuts
  are available when focus is not inside controls: `J/K` move, `X` selects the
  active finding, `R` reopens, `S` snoozes for seven days, `D` dismisses, and
  `E` resolves.
- **Key files**: `server/utils/security-scan.ts`,
  `server/utils/risk-summary.ts`, `server/utils/rdap-risk.ts`,
  `pages/risk/findings.vue`, `pages/domains/[id].vue`.
- **Lifecycle**: findings use `OPEN`, `SNOOZED`, `DISMISSED`, and `RESOLVED`;
  `SNOOZED` requires `snoozedUntil`.
- **Notifications**: Newly created high-severity findings emit
  `SECURITY_FINDING_HIGH` through the shared risk notification fan-out, with a
  dedupe key based on the finding id.

## Security Dashboard

- **What**: Owned-domain posture view. It surfaces open findings,
  registrar-lock gaps, DNS drift, new-in-window trend counts, top risky owned
  domains, recent risk rows, and task-run risk pressure history.
- **Tables**: `domains`, `risk_findings`.
- **Endpoints**: `GET /api/security/summary`, plus filtered drill-down links
  into `/api/security/findings`.
- **Key files**: `server/utils/security-dashboard.ts`,
  `server/utils/risk-metrics.ts`, `server/api/security/summary.get.ts`,
  `pages/risk/index.vue`, `pages/risk/findings.vue`.

## SSL Certificate Monitoring

- **What**: For active owned domains, fetch live TLS certificate metadata,
  record issuer/validity, preserve latest/history rows, and emit
  `SSL_EXPIRING` or `SSL_INVALID` actions.
- **Tables**: `ssl_status_latest`, `ssl_status_history`, `actions`.
- **Endpoints**: `GET /api/ssl`, `POST /api/ssl/:id/check`,
  `POST /api/ssl/check-all`.
- **Key files**: `server/utils/ssl.ts`, `server/utils/ssl-check.ts`,
  `pages/ssl.vue`.

## Email / SMTP Notifications

- **What**: Instant alerts, daily summaries, and risk alerts with
  deduplication.
- **Events**: Domain status/expiry/SSL actions and `SECURITY_FINDING_HIGH`
  can reuse the same SMTP channel.
- **Risk controls**: `eventChannelPresets` can enable or disable
  `email`, `webhook`, `serverchan`, and `push` separately for
  `SECURITY_FINDING_HIGH`. The Channels UI also shows per-channel diagnostics
  when a preset is enabled but SMTP, webhook, ServerChan, or push destinations
  are not actually configured for that event.
- **Tables**: `notification_rules`, `notification_events`, `app_settings`.
- **Endpoints**: `GET|POST /api/notifications/config`.
- **Key files**: `server/utils/mail.ts`,
  `server/utils/notification-preferences.ts`,
  `pages/notifications/channels.vue`, `pages/settings.vue`.

## Webhook Fan-out

- **What**: Per-event POST/GET to user-configured URLs with custom headers
  and event-type filtering.
- **Event filters**: Event types are stored as canonical uppercase values such
  as `SECURITY_FINDING_HIGH`; empty filters mean all events.
- **URL policy**: Webhook delivery only accepts `http` and `https`, supports
  `GET`, `POST`, `PUT`, and `PATCH`, does not follow redirects, and blocks
  private or reserved targets unless `ALLOW_PRIVATE_WEBHOOK_TARGETS=true`.
- **Tables**: `webhook_configs`, `notification_events`.
- **Endpoints**: `/api/webhooks*`, `/api/webhooks/:id/test`.
- **Key files**: `server/utils/webhook.ts`,
  `pages/notifications/webhooks.vue`, `components/WebhookModal.vue`.

## ServerChan Integration

- **What**: WeChat push through ServerChan's Markdown HTTP API, with masked
  SendKey storage and event-type opt-in.
- **Event filters**: Event types are stored as canonical uppercase values such
  as `SECURITY_FINDING_HIGH`; empty filters mean all events.
- **Tables**: `serverchan_configs`, `notification_events`.
- **Endpoints**: `/api/serverchan*`, `/api/serverchan/:id/test`.
- **Key files**: `server/utils/serverchan.ts`,
  `pages/notifications/serverchan.vue`, `components/ServerchanModal.vue`.

## Web Push / PWA

- **What**: Browser push notifications via VAPID. A hand-rolled service worker
  handles `push` and `notificationclick`.
- **Tables**: `push_subscriptions`, `notification_events`.
- **Endpoints**: `GET /api/push/vapid-public`,
  `POST|DELETE /api/push/subscribe`.
- **Key files**: `server/utils/push.ts`,
  `composables/usePushSubscription.ts`, `plugins/pwa.client.ts`,
  `public/sw.js`, `public/manifest.webmanifest`, `pages/settings.vue`.
- **Setup**: see [pwa-and-push.md](pwa-and-push.md).

## Notification History and Retry

- **What**: Full log of every notification send attempt, filterable and
  paginated, with retry that writes a new `retryOf` row.
- **Risk dedupe**: Risk fan-out stores `dedupeKey` in `metadata` for successful
  channel sends, so repeated scans can suppress duplicate risk alerts.
- **Delivery summary**: `/api/notifications/config` returns
  `riskDeliverySummary` with per-risk-event channel counts, last sent/failed
  timestamps, active dedupe-key counts for the current 24-hour window, and
  channel diagnostics containing `presetEnabled`, `configured`,
  `destinationCount`, `severity`, and `message`.
- **Tables**: `notification_events`.
- **Endpoints**: `GET /api/notifications`,
  `GET /api/notifications/:id`, `POST /api/notifications/:id/retry`.
- **Key files**: `pages/notifications/index.vue`,
  `components/NotificationDetailModal.vue`,
  `server/api/notifications/*.ts`.

## Advanced Filtering

- **What**: Search/status/watchKind/priority/group/tags/sslState/expiringDays
  filters, URL-synced criteria, and saved presets. The API is now scoped so
  domain presets use `domains` and Security Findings triage views use
  `security-findings`.
- **Tables**: `saved_filters`.
- **Endpoints**: `/api/filters*`, extended query parameters on
  `/api/domains`.
- **Key files**: `composables/useFilterState.ts`,
  `components/FilterPanel.vue`, `pages/domains/index.vue`,
  `server/api/filters/*.ts`.

## Cost Tracking and Preferences

- **What**: Per-domain expense ledger across registration, renewal, transfer,
  privacy, and other costs. Cost summary uses the configured display currency.
- **Tables**: `domain_costs`, `domain_budgets`, `app_settings`.
- **Endpoints**: `/api/costs*`, `/api/costs/summary`,
  `GET|POST /api/settings/preferences`.
- **Key files**: `server/utils/currency.ts`, `server/utils/settings.ts`,
  `server/api/costs/*.ts`, `server/api/settings/preferences.ts`,
  `pages/costs.vue`, `components/CostModal.vue`.

## CSV Import / Export

- **What**: Round-trip domain list import/export, with tags using `;` and
  optional update-existing behavior on import.
- **Endpoints**: `POST /api/domains/import`, `GET /api/domains/export`.
- **Key files**: `pages/import.vue`,
  `server/api/domains/import.post.ts`,
  `server/api/domains/export.get.ts`.

## i18n

- **What**: Bilingual UI through `@nuxtjs/i18n`; language preference is saved
  in a cookie.
- **Key files**: `i18n/locales/zh-CN.json`, `i18n/locales/en-US.json`,
  `nuxt.config.ts`, `components/AppHeader.vue`.

## UI / Design System

- Morandi-tone palette and CSS variables live in `assets/css/main.css`.
- Reusable components include `Toast`, `ConfirmDialog`, `LoadingSpinner`,
  `DomainCard`, `BaseModal`, and `*Modal.vue` forms.
- Toast API lives in `composables/useToast.ts`.
- Header and navigation live in `components/AppHeader.vue`, with primary
  dashboard/domain/risk/action/SSL links and secondary cost, notification,
  task, import, and settings links.
