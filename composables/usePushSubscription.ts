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

export const detectPushSupport = () =>
  Boolean(
    import.meta.client &&
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
  );

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
};

const toUint8Array = (value: BufferSource | null | undefined) => {
  if (!value) return null;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
};

const arrayBufferEquals = (left: BufferSource | null | undefined, right: Uint8Array) => {
  const current = toUint8Array(left);
  if (!current) return true;
  if (current.byteLength !== right.byteLength) return false;
  return current.every((value, index) => value === right[index]);
};

const getReadyServiceWorker = () =>
  Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Service worker is not ready yet")),
        8000,
      ),
    ),
  ]);

const getSubscriptionPayload = (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Browser returned an incomplete push subscription");
  }
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
};

export const usePushSubscription = () => {
  const state = useState<PushState>("push-state", () => "idle");
  const errorMessage = useState<string>("push-error", () => "");
  const supported = useState<boolean>(
    "push-supported",
    () => detectPushSupport(),
  );

  const refreshSupport = () => {
    supported.value = detectPushSupport();
    return supported.value;
  };

  const refreshState = async () => {
    if (!import.meta.client) return;
    if (!refreshSupport()) {
      state.value = "unsupported";
      return;
    }
    try {
      const reg = await getReadyServiceWorker();
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
    if (!import.meta.client || !refreshSupport()) {
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
        errorMessage.value = "VAPID keys are not fully configured on server";
        return false;
      }
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        state.value = "denied";
        return false;
      }

      const reg = await getReadyServiceWorker();
      let sub = await reg.pushManager.getSubscription();
      if (
        sub &&
        !arrayBufferEquals(sub.options?.applicationServerKey, applicationServerKey)
      ) {
        await sub.unsubscribe();
        sub = null;
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      const subscription = getSubscriptionPayload(sub);
      const response = await $fetch("/api/push/subscribe", {
        method: "POST",
        body: {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
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
    if (!import.meta.client || !refreshSupport()) return false;
    try {
      const reg = await getReadyServiceWorker();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        const response = await $fetch("/api/push/subscribe", {
          method: "DELETE",
          body: { endpoint },
        });
        unwrapApiEnvelope(response, "Push unsubscribe failed");
        await sub.unsubscribe();
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
