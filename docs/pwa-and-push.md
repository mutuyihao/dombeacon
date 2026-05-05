# PWA & Web Push

The app ships as an installable PWA with optional Web Push notifications.
This is a hand-rolled implementation (no `@vite-pwa/nuxt`) because Nuxt 4.2
has known compatibility issues with the module on Windows native builds.

## What you get

- **Installable** — Chrome / Edge / Android Chrome show an install prompt
  via `beforeinstallprompt`; the header's "Install" button surfaces only
  when the prompt is available.
- **Offline shell** — read-only API GETs are cached network-first with a
  3s timeout; navigations fall back to `/offline` when offline.
- **Web Push** — VAPID-authenticated push delivered to subscribed
  browsers, with deep-link to `/actions` on click.

## Files

| File | Role |
|---|---|
| `public/manifest.webmanifest` | App metadata, icons, theme color, app shortcuts |
| `public/sw.js` | Hand-written service worker (caching + push) |
| `public/icons/icon-192.svg`, `icon-512.svg`, `icon-maskable.svg` | App icons |
| `plugins/pwa.client.ts` | Registers the SW, auto-skipWaiting on update |
| `pages/offline.vue` | Offline fallback page |
| `composables/usePushSubscription.ts` | State machine + subscribe/unsubscribe |
| `server/api/push/vapid-public.get.ts` | Returns the VAPID public key |
| `server/api/push/subscribe.post.ts` | Register / refresh a subscription |
| `server/api/push/subscribe.delete.ts` | Unsubscribe by endpoint |
| `server/utils/push.ts` | `notifyPush`, `formatPushPayload`, `sendWebPush` |

## Service worker behavior (`public/sw.js`)

| Request type | Strategy |
|---|---|
| Pre-cached shell (`/`, `/offline`, `/manifest.webmanifest`, icons) | cache-first via install-time `cache.addAll` |
| Whitelisted read-only API GETs (`/api/domains`, `/api/actions`, `/api/notifications`, `/api/ssl`, `/api/costs`, `/api/webhooks`, `/api/serverchan`, `/api/tasks`) | network-first, 3s timeout, fall back to runtime cache |
| `/api/auth/*` and any non-GET | network-only (never cached) |
| Static assets | stale-while-revalidate |
| Navigations | network-first, fall back to cached HTML or `/offline` |

The auth route middleware (`middleware/auth.global.ts`) bypasses both
`/login` and `/offline` so the offline page is reachable without a
session.

## Setup — Web Push

### 1. Generate VAPID keys

```bash
npx web-push generate-vapid-keys --json
```

Drop the output into `.env`:

```env
VAPID_PUBLIC_KEY=BPxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:you@example.com
```

These are read at runtime via `nuxt.config.ts`'s `runtimeConfig`. The
public key is exposed via `/api/push/vapid-public`; the private key never
leaves the server.

### 2. Subscribe in the UI

Open `/settings`, scroll to **Push Notifications**, and click **Enable
push**. The composable handles:

1. Fetches VAPID public key
2. Calls `Notification.requestPermission()`
3. `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
4. POSTs the subscription JSON to `/api/push/subscribe`

The settings card surfaces these states explicitly:

| State | When |
|---|---|
| `unsupported` | Browser lacks `serviceWorker` or `PushManager` |
| `not-configured` | Server has no VAPID keys |
| `idle` | Supported but not yet subscribed |
| `subscribing` | Mid-flow |
| `subscribed` | Active |
| `denied` | User declined the permission prompt |
| `error` | Subscribe call threw — see the inline error message |

### 3. Fan-out integration

`server/utils/tasks.ts` calls `notifyPush()` alongside email / webhook /
Server酱 inside `Promise.allSettled`, so each channel is independent. Push
events are recorded into `notificationEvents` with `channel='PUSH'` so
they show up in the Notification History page like every other channel.

If the push service returns 410 Gone, the subscription is auto-disabled
in `push_subscriptions.enabled` to prevent retries.

## Browser support

- **Chrome / Edge / Android** — full support (install + push).
- **Firefox desktop** — full support.
- **Safari macOS 16+** — full support.
- **Safari iOS 16.4+** — push only works after the user adds the site to
  the Home Screen ("Add to Home Screen"). The settings card shows the
  `unsupported` message on iOS Safari prior to that, since the Push API
  isn't available in the regular tab context.

## Testing locally

Service workers require either `https://` or `http://localhost`. Run
`npm run dev` (which binds `0.0.0.0:3000`) and open
`http://localhost:3000` — that domain qualifies as a secure context.

Verifications worth doing before deploying:

- DevTools → Application → Manifest: every icon resolves, `start_url`
  is `/`, `display` is `standalone`.
- DevTools → Application → Service Workers: status `activated and
  running`, scope `/`.
- DevTools → Network: throttle to "Offline" then refresh `/domains` —
  you should see cached data or land on `/offline`.
- DevTools → Application → Push: trigger a test push to confirm the
  service worker click handler navigates to `/actions`.
