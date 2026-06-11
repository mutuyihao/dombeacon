/**
 * PWA bootstrap: register the service worker on the client.
 * Hand-rolled (no @vite-pwa/nuxt) so caching and push behavior stay explicit.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;
  if (!("serviceWorker" in navigator)) return;

  // Register after window load so it doesn't compete with first paint
  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
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
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
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
