# Product Roadmap

This is the canonical development plan for DomBeacon. Historical planning
drafts live under `docs/_archive/`; this file tracks the current product
direction and the next implementation slices.

## Product Direction

DomBeacon is moving from a domain expiry reminder toward a self-hosted,
privacy-first domain operations and attack-surface monitoring tool.

The product should stay focused on:

- Owned-domain operations: RDAP, expiry, SSL, DNS posture, and action queues.
- Self-hosted reliability: SQLite, LAN-friendly operation, audited mutations,
  and no mandatory paid data feeds.

## Shipped Capabilities

- Sensitive config handling: notification secrets are encrypted or masked, and
  `/api/health` returns only `{ ok, now }`.
- Audit trail: config changes, domain mutations, scans, finding updates, and
  notification changes write `audit_logs`.
- RDAP discovery: scans use ICANN RDAP bootstrap instead of hard-coded TLD
  endpoints.
- SSL hardening: certificate checks validate target hosts and block private or
  reserved network redirects.
- DNS/RDAP security posture: owned domains produce `dns_snapshots`,
  `risk_findings`, risk summaries, DMARC/SPF/CAA/DNSSEC signals, and registrar
  lock findings.
- Risk notification fan-out: new high-severity security findings emit
  `SECURITY_FINDING_HIGH` and reuse email, webhook, ServerChan, and Web Push
  with dedupe keys.
- Notification delivery controls: risk events have per-channel presets for
  `email`, `webhook`, `serverchan`, and `push`; the Channels UI surfaces
  delivery counts, 24-hour dedupe-key state from `notification_events`, and
  channel diagnostics for enabled presets with missing destinations. Webhook
  and ServerChan event filters normalize to canonical uppercase event names so
  risk events can be selected consistently.
- Webhook destination hardening: outbound webhook delivery only accepts
  `http` and `https` URLs, does not follow redirects, blocks private or
  reserved targets by default, and requires
  `ALLOW_PRIVATE_WEBHOOK_TARGETS=true` before LAN/private destinations are
  allowed intentionally.
- Security dashboard: `/risk` aggregates owned-domain open findings,
  registrar-lock gaps, DNS drift, new-in-window trend counts, top risky
  domains, recent risk rows, and filtered drill-down links into the
  `/risk/findings` queue. Task runs now persist
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
- Documentation archive cleanup: historical release and UI quality write-ups now
  live under `docs/_archive/`, keeping `docs/development/` focused on
  canonical development references.
- Operations UI: task history, manual task triggers, security findings, SSL
  monitoring, notification channels, costs, import/export, and settings
  preferences.

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
- Preserve the self-hosted boundary: public RDAP/DNS checks are allowed;
  paid or privileged feeds must be optional and clearly documented.

## Assumptions

- SQLite remains the default datastore.
- The application intentionally has no built-in login, session cookie, or
  `/api/auth/*` surface in the current product phase. It is suitable by
  default for trusted self-hosted/LAN environments; public exposure should be
  protected by a reverse proxy, VPN, or network boundary, and first-party auth
  is out of scope for this slice.
- Background scans remain best-effort and lock-protected through the database.
- Canonical docs stay in English; archived design notes may keep their original
  language.
