# Domain Watchlist Product Direction Plan

Status: draft for discussion
Last updated: 2026-04-30

## Summary

This project should move from a generic domain monitoring MVP toward a self-hosted domain opportunity radar and domain status ledger.

The primary audience is a combination of:

- Domain investors who want to track wanted domains, availability, expiration, and deletion opportunities.
- Internal operators who want a lightweight domain status ledger for owned or watched domains.

The product should not become a public SaaS, full team collaboration suite, or heavy brand protection platform in v1.

## Confirmed Direction

- Deployment shape: self-hosted single instance.
- Access model: no-password mode is allowed for trusted internal networks; if an admin password is configured, the app should require a simple gate before accessing pages or write APIs.
- Core value: combine opportunity radar and status ledger.
- v1 workflow: combine domain list management, domain asset ledger, periodic scanning, status history, notifications, and an action-oriented dashboard.
- Primary data source: RDAP first. WHOIS fallback can be discussed later.

## Current Project Facts

- The app is a Nuxt-based project with SQLite, Drizzle, RDAP scanning, node-cron scheduling, and SMTP notification scaffolding.
- Production build passed with `npm.cmd run build` when run outside the sandbox.
- `drizzle-kit check` passed when run outside the sandbox.
- Local runtime currently has a native dependency mismatch: the installed `better-sqlite3` binary was compiled for a different Node ABI than the active local Node runtime.
- The repository has no committed baseline yet; all project files are currently untracked.
- Daily summary email is still a placeholder, despite being described as a feature.
- The current README positions the product partly for brand protection, but the chosen v1 direction should de-emphasize that claim.

## Product Model

The core domain record should represent a watch item.

Required conceptual fields:

- `domain`: normalized domain name.
- `watchKind`: `OWNED` or `WANTED`.
- `priority`: `LOW`, `MEDIUM`, or `HIGH`.
- `groupName`: optional portfolio, project, or context grouping.
- `tags`: flexible labels for filtering.
- `note`: user-maintained context.
- `isActive`: whether the domain should continue to be scanned.

Status tracking should remain separate from the domain record.

Required status concepts:

- `status`: `AVAILABLE`, `REGISTERED`, `EXPIRING`, `DROPPING`, or `UNKNOWN`.
- `checkedAt`: latest successful check time.
- `expiresAt`: parsed expiration date when available.
- `registrar`: parsed registrar when available.
- `nameservers`: parsed nameservers when available.
- `source`: initially `rdap`.
- `parseReason`: short explanation for the status decision.
- `lastError` and `lastErrorAt`: scan errors should not overwrite the last known business status.

## Main Workflows

### Dashboard

The dashboard should become action-first instead of just list-first.

It should show:

- Domains needing action today.
- Wanted domains that became available, expiring, or dropping.
- Owned domains approaching expiration.
- Recent status changes.
- Scan health and last successful scan time.

### Domains

The domain list should support:

- Manual add.
- Bulk import from newline text or CSV.
- Filtering by status, watch kind, group, tag, priority, and active state.
- Export to CSV.
- Clear handling for empty states, scan errors, and never-checked domains.

### Domain Detail

The detail page should become the source of truth for one watch item.

It should show:

- Current normalized domain metadata.
- Latest parsed status.
- Status history timeline.
- Scan errors if any.
- Raw RDAP snapshot behind an expandable developer/debug section.
- Notes, tags, group, priority, and watch kind.

### Actions

The product should expose a derived action queue.

Example action types:

- `WANTED_AVAILABLE`: wanted domain appears available.
- `WANTED_DROPPING`: wanted domain appears in deletion-related state.
- `OWNED_EXPIRING`: owned domain is within the configured expiration threshold.
- `SCAN_FAILED`: repeated checks failed for a domain.

Actions should support:

- Open.
- Dismiss.
- Snooze.
- Resolve automatically when the underlying condition disappears.

### Notifications

SMTP email remains the v1 notification channel.

Notification triggers should be based on watch kind:

- `WANTED`: notify on availability, dropping, and meaningful status changes.
- `OWNED`: notify on expiration thresholds and scan failures.
- Daily digest: summarize open actions, expiring owned domains, wanted opportunities, scan health, and recent changes.

## Public Interfaces

Planned API-level changes:

- Extend domain create/update payloads with `watchKind`, `priority`, `groupName`, `tags`, `note`, and `isActive`.
- Add `POST /api/domains/import` for newline or CSV import.
- Add `GET /api/actions` for the action queue.
- Add `POST /api/actions/:id/dismiss` for dismissing an action.
- Add `POST /api/actions/:id/snooze` for postponing an action.
- Extend `GET /api/domains` filters to include watch kind, priority, group, tag, active state, status, and search.
- Extend notification config with expiration thresholds, opportunity-alert toggles, and digest options.
- Add optional password-gate endpoints if an admin password is configured.

Default compatibility rule:

- Existing domain records should migrate to `watchKind = "WANTED"` unless a better rule is selected during discussion.
- Existing tags, notes, groups, status history, and notification config should be preserved.

## Engineering Direction

- Keep Nuxt, SQLite, Drizzle, Docker, and SMTP for v1.
- Standardize on npm unless there is a later decision to use pnpm; the Dockerfile and README already assume npm.
- Pin one Node major across local development, Docker, and CI, then rebuild native dependencies to avoid `better-sqlite3` ABI mismatch.
- Add an automatic or documented migration path for first-run Docker deployments.
- Remove or archive temporary Drizzle inspection files before the first real commit.
- Create a clean git baseline before larger refactors.

## Test Plan

- Build: `npm.cmd run build`.
- Migration check: `npx.cmd drizzle-kit check`.
- Runtime smoke: start the built server and verify SQLite opens successfully.
- API tests: domain CRUD, duplicate domain handling, filters, import result reporting, delete cascade, and notification config save/load.
- Scanner tests: RDAP 404, normal registered response, expiration within threshold, pending-delete-like status, rate limit, and network failure.
- Action tests: wanted available, wanted dropping, owned expiring, scan failed, dismiss, snooze, and auto-resolution.
- Auth tests: no-password mode allows access; configured password mode blocks protected pages and write APIs until authenticated.
- Docker smoke: empty data volume starts predictably, database schema exists, and data persists after restart.

## Out Of Scope For v1

- Public SaaS.
- Multi-tenant accounts.
- Full RBAC or team collaboration.
- Billing.
- Automated domain registration or backorder provider integration.
- Brand similarity discovery.
- Legal evidence workflows for brand protection.
- WHOIS fallback, unless RDAP-only coverage proves insufficient during testing.

## Open Questions

- Should existing domains default to `WANTED`, or should the import/add flow force users to choose `OWNED` vs `WANTED` before migration?
- Should the app name stay `Domain Watchlist`, or should it shift toward a more opportunity-oriented name such as `Domain Radar`?
- Should CSV import support only `domain`, `watchKind`, `group`, `tags`, `note`, and `priority`, or also registrar and renewal metadata for owned domains?
- Should action snooze be time-based only, or also condition-based, for example "until status changes again"?
- Should password-gate configuration live in `.env`, database settings, or both?
- Should daily digest be a single fixed email or configurable sections?

## References

- ICANN RDAP overview: https://www.icann.org/rdap/
- DomainTrack feature reference: https://www.domaintrack.it/features/domain-monitoring
- DomainWatch reference: https://domainwatch.co/
- TrackDomain reference: https://trackdomain.app/
