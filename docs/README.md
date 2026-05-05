# DomBeacon (域灯) — Docs

Canonical documentation for the project. The shape is intentionally small:
one place per topic, no duplicate narratives.

## Start here

| Doc | What's in it |
|---|---|
| [overview.md](overview.md) | Product positioning, core concepts, architecture, data model |
| [api.md](api.md) | Every Nitro endpoint under `server/api/*`, organised by area |
| [features.md](features.md) | One-page reference for every shipped feature (DB tables, key endpoints, key files) |
| [pwa-and-push.md](pwa-and-push.md) | PWA install + Web Push setup, VAPID keys, browser support matrix |

## Run / Deploy

- Quick start lives in the project's [README.md](../README.md)
- [deployment/docker-troubleshooting.md](deployment/docker-troubleshooting.md) — common Docker issues
- [deployment/windows-port-conflict.md](deployment/windows-port-conflict.md) — why Docker uses port 8080

## Development

- [development/migration.md](development/migration.md) — Drizzle schema migrations, `DATABASE_PATH`, what's in each migration file
- [development/v1.2-changelog.md](development/v1.2-changelog.md) — what shipped in v1.2 and where to find it

## Archive

Historical narratives, planning drafts, and per-feature implementation
walkthroughs that are no longer the canonical reference live in
[_archive/](_archive/). They're kept for context, not for lookup.
