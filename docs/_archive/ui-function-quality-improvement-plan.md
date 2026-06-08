# UI And Function Quality Improvement Plan

Date: 2026-05-04

This document tracks the planned product, UI, and function-quality changes found during the project review. The goal is to make the app feel like a coherent domain-ops console rather than a set of loosely connected pages.

## Phase 1: Fix Broken Or Misleading Behavior

- Unify toast usage around the global `useToast()` composable and the single layout-level `<Toast />`. Remove page-local `<Toast ref="toast" />` usage and old `toast.value?.show()` calls so SSL, costs, import/export, notification history, Webhook, and ServerChan feedback actually appears.
- Fix SSL data visibility. The SSL page should list all active domains, including domains without an `ssl_status_latest` row, and show an explicit "not checked" state with a "check now" action.
- Allow manual SSL checks for any active domain from the SSL page. SSL risk actions and notifications should remain limited to `OWNED` domains unless the product later adds a separate policy for `WANTED` domains.
- Fix the cost page domain dropdown contract. `/api/domains` returns `data.items`, so cost creation must consume the list correctly instead of treating `data` as an array.
- Fix CSV import row-level error handling so one malformed row does not break the whole import. Honor the `updateExisting` option instead of always updating existing domains.
- Remove fake edit behavior on the domain detail page. Wire the existing domain update API into an actual edit modal or reuse the add-domain modal in edit mode.
- Make domain card actions usable on touch devices. Refresh/delete controls should not depend on hover-only visibility.
- Remove or define invalid visual tokens such as `text-text-tertiary`.

## Phase 2: Strengthen Core UX Flows

- Add pagination or infinite loading controls to the domain list so the existing `page` and `limit` API behavior is visible and controllable.
- Improve row-level loading states for per-domain refresh, SSL check, notification retry, webhook test, ServerChan test, and cost deletion.
- Make task triggering observable. `/api/tasks/trigger` should return a meaningful status, and the task page should show locked/running state rather than refreshing once after one second.
- Improve error surfaces. Prefer actionable inline errors where the user can recover; reserve toast for short confirmation or non-blocking failure.
- Standardize API response shape for new and touched endpoints. Prefer `{ code, msg, data }` to match most internal APIs, or introduce a typed client that normalizes mixed legacy shapes.

## Phase 3: Upgrade Information Architecture And Visual System

- Replace the root redirect with a real dashboard showing open actions, expiring domains, SSL risks, failed notifications, recent task runs, and cost summary.
- Remove nested page containers where the layout already provides the page shell. Group pages should provide tabs; child pages should provide content.
- Define page templates for list pages, detail pages, settings pages, and operational history pages so spacing, headers, actions, tables, empty states, and loading states are consistent.
- Rework the visual hierarchy. Use stronger risk/action cards, calmer data cards, and lower-weight helper panels instead of the same light bordered card everywhere.
- Collapse advanced technical sections in the domain detail page by default, especially RDAP raw snapshot.

## Phase 4: Data And Security Hardening

- Improve tag filtering accuracy. Avoid substring matching against `tags_json`; use exact JSON matching or normalize tags into a table.
- Replace password-as-session-cookie with an opaque signed session token and add login failure throttling.
- Add validation for notification settings, SMTP config, webhook URLs, ServerChan keys, cost values, and domain updates.
- Ensure migration tooling and docs match current schema, especially v1.2 tables and indexes.

## Initial Implementation Order

1. Fix broken feedback and data display issues: Toast, SSL unscanned domains, cost domain dropdown, CSV import.
2. Complete edit-domain flow and mobile card actions.
3. Normalize layout containers and invalid visual tokens.
4. Add dashboard and deeper IA/visual upgrades.
5. Harden auth, tag matching, task observability, and API response contracts.

## Acceptance Criteria

- `baidu.com` and any other active domain appears on the SSL page even before an SSL scan has run.
- Manual SSL check creates or updates the visible SSL row for the selected domain.
- User-visible success/failure messages appear consistently across SSL, costs, import/export, notifications, Webhooks, and ServerChan.
- Domain metadata can be edited from the detail page.
- Touch users can refresh/delete domain cards without hover.
- Pages no longer rely on undefined Tailwind theme tokens.

## Implementation Notes: 2026-05-04

- Phase 1 started. Toast usage, SSL unscanned-domain visibility, SSL scan consistency, cost dropdown data contract, CSV import row handling, edit-domain flow, mobile card actions, and the missing `text-tertiary` token were addressed in code.
- The root path was changed from a redirect to a dashboard-style overview that surfaces open actions, SSL risk, failed notifications, recent task runs, and quick links.
- SSL scans now update the latest SSL state for every active domain. SSL actions and notifications remain limited to `OWNED` domains.
- No build was run as requested. Verification for this pass is limited to static greps and JSON parsing.

## Implementation Notes: 2026-05-04 Continued

- Domain list pagination is now exposed in the UI, with page size control and clear page range text instead of silently relying on fixed API pagination.
- Per-domain refresh/delete now has row-level pending state on each card, so one operation does not make the whole list feel frozen or ambiguous.
- Task triggering now returns a queued task payload, and task history now reports active task locks so the UI can show currently running jobs.
- The raw RDAP snapshot on the domain detail page is collapsed by default and framed as advanced troubleshooting data.

## Implementation Notes: 2026-05-04 Continued 2

- Removed nested page containers from Data, Notifications, and Actions child pages so spacing and tab alignment are controlled by the global layout shell.
- Added pagination and row-level operation pending states to the Actions queue.
- Changed domain tag filtering to exact JSON-array membership matching instead of substring `LIKE`, reducing false positives such as short tags matching unrelated text.

## Implementation Notes: 2026-05-04 Navigation Governance

- Repositioned the primary navigation around business modules: Overview, Domains, Actions, SSL, Costs, Notifications, and Settings. Ambiguous top-level entries like Data and Console are no longer exposed in the main menu.
- Promoted Costs to a first-level route and added cost visibility to the overview metrics and quick links.
- Moved import/export into explicit maintenance entry points: a button on the Domains page and a Data import/export card in Settings.
- Moved task history/automation out of the primary menu and into Settings, while preserving direct `/tasks` and legacy `/ops/tasks` access.
- Kept legacy Data/Ops routes available as compatibility paths, but mapped active navigation back to the new module ownership.

## Implementation Notes: 2026-05-04 SSL Auto-Refresh Correction

- Fixed SSL latest-status writes so transient scan errors no longer overwrite a previously successful certificate snapshot with `hasSSL=false`.
- Failed SSL attempts now update `lastError` / `lastErrorAt` while keeping the last known-good issuer, validity dates, and expiry days.
- SSL list/detail pages now explain when certificate data is retained from the last successful scan after a later failed check.

## Implementation Notes: 2026-05-04 Notification History Correction

- Fixed notification history loading for older local databases where the v1.2 `notification_events.retry_of` column and related tables/indexes had not been applied.
- Added startup-time additive schema compatibility checks for the v1.2 notification retry, push subscription, saved filter, and index changes.
- Hardened the notification history page request/response handling so API business errors do not turn into secondary empty-payload errors in the UI.
