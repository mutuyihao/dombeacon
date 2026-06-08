# DomBeacon Docs

Canonical documentation for the project. The shape is intentionally small:
one place per topic, no duplicate narratives.

## Start here

| Doc | What's in it |
|---|---|
| [overview.md](overview.md) | Product positioning, core concepts, architecture, data model |
| [api.md](api.md) | Every public Nitro endpoint under `server/api/*`, organised by area |
| [features.md](features.md) | One-page reference for shipped features, tables, endpoints, and key files |
| [pwa-and-push.md](pwa-and-push.md) | PWA install + Web Push setup, VAPID keys, browser support matrix |

## Run / Deploy

- Quick start lives in the project's [README.md](../README.md).
- [deployment/docker-troubleshooting.md](deployment/docker-troubleshooting.md) covers common Docker issues.
- [deployment/windows-port-conflict.md](deployment/windows-port-conflict.md) explains why Docker uses port 8080.

## Development

- [development/product-roadmap.md](development/product-roadmap.md) is the canonical product plan.
- [development/migration.md](development/migration.md) covers Drizzle schema migrations, `DATABASE_PATH`, and migration files.

## Archive

Historical narratives, planning drafts, and per-feature implementation
walkthroughs that are no longer the canonical reference live in
[_archive/](_archive/). They are kept for context, not for lookup.
