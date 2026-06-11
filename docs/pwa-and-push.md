# PWA & Web Push

The app ships as an installable PWA with optional Web Push notifications.
This is a hand-rolled implementation (no `@vite-pwa/nuxt`) so the service
worker behavior stays explicit and easy to audit.

## What you get

- **Installable** - Chrome / Edge / Android Chrome show an install prompt
  via `beforeinstallprompt`; the Settings page exposes the install action only
  when the prompt is available.
- **Offline shell** - navigations fall back to `/offline` when offline; API
  requests and other non-static same-origin GETs are never cached.
- **Web Push** - VAPID-authenticated push delivered to subscribed browsers,
  with same-origin deep-link handling on click.

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

## Service Worker Behavior (`public/sw.js`)

| Request type | Strategy |
|---|---|
| Pre-cached shell (`/`, `/offline`, `/manifest.webmanifest`, icons) | cache-first via install-time `cache.addAll` |
| Any `/api/*` request, including GET | network-only (never cached) |
| Static assets (`/_nuxt/*`, scripts, styles, images, fonts, manifest) | stale-while-revalidate |
| Other same-origin GET requests | network-only |
| Navigations | network-first, fall back to cached HTML or `/offline` |

The offline page is always reachable because it is pre-cached. Keeping every
API request and other non-static GET network-only avoids caching domain,
notification, or mutation data in the no-login deployment model.

## Setup - Web Push

### 1. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys --json
```

Drop the output into `.env`:

```env
VAPID_PUBLIC_KEY=BPxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:you@example.com
```

These are read at runtime via `nuxt.config.ts`'s `runtimeConfig`. The public
key is exposed via `/api/push/vapid-public`; the private key never leaves the
server. The endpoint reports `configured: true` only when public key, private
key, and subject are all present.

### 2. Subscribe In The UI

Open `/settings`, scroll to **Push Notifications**, and click **Enable push**.
The composable handles:

1. Fetches VAPID public key.
2. Calls `Notification.requestPermission()`.
3. Calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
4. POSTs the subscription JSON to `/api/push/subscribe`.

If the browser already has a subscription tied to an older VAPID public key,
the client unsubscribes locally and creates a fresh subscription before saving
it to the server.

The settings card surfaces these states explicitly:

| State | When |
|---|---|
| `unsupported` | Browser lacks `serviceWorker` or `PushManager` |
| `not-configured` | Server has no VAPID keys |
| `idle` | Supported but not yet subscribed |
| `subscribing` | Mid-flow |
| `subscribed` | Active |
| `denied` | User declined the permission prompt |
| `error` | Subscribe call threw; see the inline error message |

### 3. Fan-out Integration

`server/utils/tasks.ts` calls `notifyPush()` alongside email, webhook, and
ServerChan inside `Promise.allSettled`, so each channel is independent. Push
events are recorded into `notificationEvents` with `channel='PUSH'` so they
show up in the Notification History page like every other channel.

If the push service returns 410 Gone, the subscription is auto-disabled in
`push_subscriptions.enabled` to prevent retries.

## Browser Support

- **Chrome / Edge / Android** - full support (install + push).
- **Firefox desktop** - full support.
- **Safari macOS 16+** - full support.
- **Safari iOS 16.4+** - push only works after the user adds the site to the
  Home Screen ("Add to Home Screen"). The settings card shows the
  `unsupported` message on iOS Safari prior to that, since the Push API is not
  available in the regular tab context.

## Testing Locally

Service workers require either `https://` or `http://localhost`. Run
`pnpm dev` (which binds `0.0.0.0:3000`) and open `http://localhost:3000`;
that domain qualifies as a secure context.

Verifications worth doing before deploying:

- DevTools > Application > Manifest: every icon resolves, `start_url` is `/`,
  and `display` is `standalone`.
- DevTools > Application > Service Workers: status is `activated and running`,
  scope `/`.
- DevTools > Network: throttle to "Offline" then refresh `/domains`; you
  should land on `/offline`, while `/api/*` calls remain network-only.
- DevTools > Application > Push: trigger a test push to confirm the service
  worker click handler navigates to a same-origin path such as `/actions`.
