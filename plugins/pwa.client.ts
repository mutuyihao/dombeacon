/**
 * PWA bootstrap: register the service worker on the client.
 * Hand-rolled (no @vite-pwa/nuxt) so caching and push behavior stay explicit.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;
  let hadController = Boolean(navigator.serviceWorker.controller);

  // Register after window load so it doesn't compete with first paint
  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      reg.update().catch(() => {
        /* best-effort update check */
      });

      // Auto-prompt the SW to activate when an update is found.
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New SW available; tell it to take over immediately.
            installing.postMessage("SKIP_WAITING");
          }
        });
      });

      // Reload once the new SW takes control so users see the new build.
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController) {
          hadController = true;
          return;
        }
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (e) {
      console.warn("[PWA] service worker registration failed:", e);
    }
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
});
