/**
 * Composable for managing the user's Web Push subscription.
 *
 * Exposes reactive `state` (idle | unsupported | subscribing | subscribed
 * | denied | error) plus `subscribe()`/`unsubscribe()`.
 *
 * Server side it stays a no-op so the composable is SSR-safe.
 */

import { unwrapApiEnvelope } from "~/utils/api-envelope";

type PushState =
  | "idle"
  | "unsupported"
  | "not-configured"
  | "subscribing"
  | "subscribed"
  | "denied"
  | "error";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
};

export const usePushSubscription = () => {
  const state = useState<PushState>("push-state", () => "idle");
  const errorMessage = useState<string>("push-error", () => "");
  const supported = useState<boolean>(
    "push-supported",
    () =>
      import.meta.client &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
  );

  const refreshState = async () => {
    if (!import.meta.client) return;
    if (!supported.value) {
      state.value = "unsupported";
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        state.value = "subscribed";
      } else if (Notification.permission === "denied") {
        state.value = "denied";
      } else {
        state.value = "idle";
      }
    } catch (e: any) {
      state.value = "error";
      errorMessage.value = e.message || String(e);
    }
  };

  const subscribe = async () => {
    if (!import.meta.client || !supported.value) {
      state.value = "unsupported";
      return false;
    }

    state.value = "subscribing";
    errorMessage.value = "";

    try {
      // Fetch VAPID public key
      const vapidResp = await $fetch<{
        code: number;
        msg: string;
        data: { publicKey: string; configured: boolean };
      }>("/api/push/vapid-public");
      const vapidData = unwrapApiEnvelope(vapidResp, "Failed to load VAPID key");
      const publicKey = vapidData?.publicKey || "";
      if (!vapidData?.configured || !publicKey) {
        state.value = "not-configured";
        errorMessage.value = "VAPID keys not configured on server";
        return false;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        state.value = "denied";
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = sub.toJSON();
      const response = await $fetch("/api/push/subscribe", {
        method: "POST",
        body: {
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        },
      });
      unwrapApiEnvelope(response, "Push subscribe failed");

      state.value = "subscribed";
      return true;
    } catch (e: any) {
      state.value = "error";
      errorMessage.value = e.message || String(e);
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!import.meta.client || !supported.value) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        const response = await $fetch("/api/push/subscribe", {
          method: "DELETE",
          body: { endpoint },
        });
        unwrapApiEnvelope(response, "Push unsubscribe failed");
      }
      state.value = "idle";
      return true;
    } catch (e: any) {
      state.value = "error";
      errorMessage.value = e.message || String(e);
      return false;
    }
  };

  return {
    state,
    errorMessage,
    supported,
    refreshState,
    subscribe,
    unsubscribe,
  };
};
