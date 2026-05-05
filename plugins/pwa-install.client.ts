/**
 * PWA install prompt state:
 * Keep the `beforeinstallprompt` event in a shared Nuxt state so we can
 * expose the install entry in a low-friction place (Settings), without
 * adding a "big install" CTA in the header.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  const { promptEvent, canInstall, installed, refreshInstalled } =
    usePwaInstall();

  refreshInstalled();

  const onBeforeInstall = (e: Event) => {
    // If already installed, ignore.
    if (installed.value) return;

    e.preventDefault();
    promptEvent.value = e as any;
    canInstall.value = true;
  };

  const onInstalled = () => {
    promptEvent.value = null;
    canInstall.value = false;
    installed.value = true;
  };

  window.addEventListener("beforeinstallprompt", onBeforeInstall);
  window.addEventListener("appinstalled", onInstalled);

  // Best-effort cleanup (Nuxt plugins live for app lifetime, but keep it tidy).
  window.addEventListener(
    "beforeunload",
    () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    },
    { once: true },
  );
});
