/* DomBeacon Service Worker.
 * Hand-rolled so caching and push behavior stay explicit.
 * Provides:
 *   - Stale-while-revalidate for static assets
 *   - Network-only for all API requests (no sensitive response caching)
 *   - Offline fallback page
 *   - Web Push handler + click navigation
 */

const VERSION = "v1.2.0";
const PRECACHE = `precache-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // Use addAll with `cache: 'reload'` to bypass HTTP cache during install.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache
            .add(new Request(url, { cache: "reload" }))
            .catch((err) => console.warn("[SW] precache miss:", url, err)),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== PRECACHE && key !== RUNTIME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

const isApi = (url) => url.pathname.startsWith("/api/");

const networkWithTimeout = (request, timeoutMs = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("network timeout")),
      timeoutMs,
    );
    fetch(request).then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GETs.
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // API: network-only. API responses can include operational or secret config.
  if (isApi(url)) {
    return;
  }

  // Navigation requests: network first, fall back to offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await networkWithTimeout(request, 3000);
          return fresh;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || Response.error();
        }
      })(),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((res) => {
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })(),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: "DomBeacon", body: event.data.text() };
  }

  const title = payload.title || "DomBeacon";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    data: { url: payload.url || "/actions", ...(payload.data || {}) },
    tag: payload.data?.eventType || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/actions";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // If a window is already open, focus it and navigate.
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              // Navigation may fail across origins.
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
