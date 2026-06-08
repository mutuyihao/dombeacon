# Product Roadmap

This is the canonical development plan for DomBeacon. Historical planning
drafts live under `docs/_archive/`; this file tracks the current product
direction and the next implementation slices.

## Product Direction

DomBeacon is moving from a domain expiry reminder toward a self-hosted,
privacy-first domain attack-surface and brand-abuse monitoring tool.

The product should stay focused on:

- Owned-domain operations: RDAP, expiry, SSL, DNS posture, and action queues.
- Brand-abuse monitoring: local lookalike generation, RDAP checks, and public
  Certificate Transparency discovery.
- Self-hosted reliability: SQLite, explicit auth defaults, audited mutations,
  and no mandatory paid data feeds.

The open-source edition must not claim full-zone, real-time new-registration
discovery. That capability usually requires zone files, commercial NRD/NXD
feeds, or registrar-scale data.

## Shipped Capabilities

- Secure auth defaults: normal deployments require `ADMIN_PASSWORD`; auth is
  disabled only when `AUTH_DISABLED=true` is explicit.
- Sensitive config handling: notification secrets are encrypted or masked, and
  `/api/health` returns only `{ ok, now }`.
- Audit trail: login, logout, config changes, domain mutations, scans, finding
  updates, and Brand Watch changes write `audit_logs`.
- RDAP discovery: scans use ICANN RDAP bootstrap instead of hard-coded TLD
  endpoints.
- SSL hardening: certificate checks validate target hosts and block private or
  reserved network redirects.
- DNS/RDAP security posture: owned domains produce `dns_snapshots`,
  `risk_findings`, risk summaries, DMARC/SPF/CAA/DNSSEC signals, and registrar
  lock findings.
- Brand Watch: terms generate exact, typo, prefix/suffix, and homoglyph
  candidates; RDAP checks candidate state; crt.sh CT results persist observed
  domains with `brand_watch_candidates.source='ct'`; candidates support
  manual review states `OPEN`, `WATCHING`, `DISMISSED`, and `RESOLVED`; risk
  lists support term, source, mutation, and seen-window filtering; saved risk
  views use scoped `saved_filters` entries.
- Risk notification fan-out: new high-severity security findings emit
  `SECURITY_FINDING_HIGH`, newly registered Brand Watch candidates emit
  `BRAND_WATCH_REGISTERED`, and both reuse email, webhook, ServerChan, and Web
  Push with dedupe keys.
- Notification delivery controls: risk events have per-channel presets for
  `email`, `webhook`, `serverchan`, and `push`; the Channels UI surfaces
  delivery counts, 24-hour dedupe-key state from `notification_events`, and
  channel diagnostics for enabled presets with missing destinations. Webhook
  and ServerChan event filters normalize to canonical uppercase event names so
  risk events can be selected consistently.
- Security dashboard: `/ops/security` aggregates owned-domain open findings,
  registrar-lock gaps, DNS drift, registered Brand Watch lookalikes,
  new-in-window trend counts, top risky domains, recent risk rows, and filtered
  drill-down links into the `/ops/findings` queue. Task runs now persist
  normalized `riskMetrics` snapshots so the dashboard can render risk pressure
  history. The findings queue supports visible-row selection and bulk
  lifecycle updates through `/api/security/findings/bulk`; operators can save
  scoped triage views under `security-findings`; keyboard shortcuts support
  moving, selecting, reopening, snoozing, dismissing, and resolving the active
  finding.
- Documentation guardrails: `tests/docs-api-inventory.test.ts` derives public
  Nitro API paths from `server/api` and verifies each one is listed in
  `docs/api.md`; `tests/docs-development-inventory.test.ts` keeps
  `docs/development/` limited to canonical references.
- Documentation archive cleanup: historical v1.2 and UI quality write-ups now
  live under `docs/_archive/`, keeping `docs/development/` focused on
  canonical development references.
- Operations UI: Brand Watch page, task history, manual task triggers, security
  findings, SSL monitoring, notification channels, costs, import/export, and
  settings preferences.

## Next Development Slices

1. Documentation and operational polish
   - Keep `docs/api.md` aligned with every public Nitro endpoint.
   - Keep `docs/features.md` as the lookup reference for shipped behavior.
   - Keep the `docs/development/` canonical-doc allowlist small; move
     historical implementation write-ups into `docs/_archive/`.
2. Risk operations UX hardening
   - Harden edge cases found during operator review of saved triage views,
     keyboard shortcuts, and bulk lifecycle updates.

## Validation Gate

Before closing a development slice:

- Run `git diff --check`.
- Run `vitest run`.
- Run `nuxt build`.
- Verify docs for changed public endpoints, tables, environment variables, and
  scheduled tasks.
- Preserve the self-hosted boundary: public RDAP/CT/DNS checks are allowed;
  paid or privileged feeds must be optional and clearly documented.

## Assumptions

- SQLite remains the default datastore.
- The application remains single-admin/password-gated for the current product
  phase.
- Background scans remain best-effort and lock-protected through the database.
- Canonical docs stay in English; archived design notes may keep their original
  language.
