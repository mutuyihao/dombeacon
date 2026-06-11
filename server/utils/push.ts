import { eq } from "drizzle-orm";
import { pushSubscriptions, notificationEvents } from "../db/schema";
import { maskSecretText, revealSecretText } from "./secrets";

/**
 * Web Push notification helper.
 */

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: any;
}

const MAX_PUSH_TITLE_LENGTH = 90;
const MAX_PUSH_BODY_LENGTH = 240;

/**
 * True if VAPID env vars are configured. Until the user generates and sets
 * VAPID keys, push notifications are silently skipped.
 */
export const isPushConfigured = () => {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
};

const cleanPushText = (value: unknown, fallback = "") => {
  const text = String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
};

const truncatePushText = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const safeJsonPreview = (value: unknown) => {
  try {
    const json = JSON.stringify(value ?? {});
    return json && json !== "{}" ? json : "Domain event received";
  } catch {
    return "Domain event received";
  }
};

export const normalizePushNavigationUrl = (
  value: unknown,
  fallback = "/actions",
) => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    const url = new URL(value, "https://dombeacon.local");
    if (url.origin !== "https://dombeacon.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

const defaultPushUrl = (eventType: string) => {
  if (eventType === "SECURITY_FINDING_HIGH") return "/risk/findings";
  if (eventType === "DAILY_SUMMARY") return "/";
  return "/actions";
};

const pushErrorMessage = (error: any) => {
  const statusCode = error?.statusCode || error?.status;
  const base = error?.message || String(error);
  if (statusCode) return `HTTP ${statusCode}: ${base}`;
  return base;
};

/**
 * Send web push to a single subscription using the `web-push` package.
 * Returns { success, error }.
 */
export const sendWebPush = async (
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: WebPushPayload,
): Promise<{ success: boolean; error?: string }> => {
  if (!isPushConfigured()) {
    return { success: false, error: "VAPID keys not configured" };
  }

  try {
    // Lazy import so the dependency only loads when actually used
    const webPush = await import("web-push" as any).catch(() => null);
    if (!webPush) {
      return { success: false, error: "web-push package not installed" };
    }

    const lib = (webPush as any).default || webPush;
    lib.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );

    await lib.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );
    return { success: true };
  } catch (e: any) {
    return { success: false, error: pushErrorMessage(e) };
  }
};

const revealSubscription = (subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) => ({
  endpoint: revealSecretText(subscription.endpoint),
  p256dh: revealSecretText(subscription.p256dh),
  auth: revealSecretText(subscription.auth),
});

/**
 * Format a notification payload from event data, used by both fanout and retry.
 */
export const formatPushPayload = (
  eventType: string,
  eventData: any,
): WebPushPayload => {
  const data =
    eventData && typeof eventData === "object" && !Array.isArray(eventData)
      ? eventData
      : {};
  const domain = cleanPushText(data.domain, "Domain");
  const titleMap: Record<string, string> = {
    WANTED_AVAILABLE: `🎉 ${domain} is available`,
    WANTED_DROPPING: `⚠️ ${domain} pending delete`,
    OWNED_EXPIRING: `⏰ ${domain} expiring soon`,
    SSL_EXPIRING: `🔒 ${domain} SSL expiring`,
    SSL_INVALID: `🔒 ${domain} SSL invalid`,
    SECURITY_FINDING_HIGH: `Security risk: ${domain}`,
    SCAN_FAILED: `❌ Scan failed: ${domain}`,
    DAILY_SUMMARY: `📊 Daily Summary`,
    DROPPING_ALERT: `🚨 Domains dropping`,
    STATUS_CHANGE: `🔄 ${domain} status changed`,
  };
  const fallbackBody = safeJsonPreview(data);
  const url = normalizePushNavigationUrl(data.url, defaultPushUrl(eventType));

  return {
    title: truncatePushText(
      cleanPushText(titleMap[eventType] || `DomBeacon: ${eventType}`),
      MAX_PUSH_TITLE_LENGTH,
    ),
    body: truncatePushText(
      cleanPushText(data.message, fallbackBody),
      MAX_PUSH_BODY_LENGTH,
    ),
    icon: "/icons/icon-192.svg",
    url,
    data: { eventType, ...data, url },
  };
};

/**
 * Fan out a notification to all enabled push subscriptions.
 * Records each delivery in notification_events.
 */
export const notifyPush = async (params: {
  domainId?: number;
  actionId?: number;
  eventType: string;
  eventData: any;
}): Promise<number> => {
  const { domainId, actionId, eventType, eventData } = params;

  if (!isPushConfigured()) {
    return 0;
  }

  const db = useDb();
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.enabled, true))
    .all();

  if (subs.length === 0) return 0;

  const payload = formatPushPayload(eventType, eventData);
  let successCount = 0;
  const now = new Date();

  for (const sub of subs) {
    let result: { success: boolean; error?: string };
    let endpointMasked = "";
    try {
      const subscription = revealSubscription(sub);
      endpointMasked = maskSecretText(subscription.endpoint, 10);
      result = await sendWebPush(subscription, payload);
    } catch (error: any) {
      endpointMasked = maskSecretText(sub.endpoint, 10);
      result = {
        success: false,
        error: error?.message || "Push subscription secret could not be read",
      };
    }

    await db.insert(notificationEvents).values({
      domainId: domainId || null,
      actionId: actionId || null,
      eventType,
      channel: "PUSH",
      status: result.success ? "SENT" : "FAILED",
      sentAt: result.success ? now : null,
      failedAt: result.success ? null : now,
      errorMessage: result.error || null,
      metadata: JSON.stringify({
        subscriptionId: sub.id,
        endpointMasked,
        dedupeKey: eventData?.dedupeKey || null,
        eventData,
      }),
      createdAt: now,
    });

    if (result.success) successCount++;

    // If the endpoint is gone (410), disable the subscription
    if (
      !result.success &&
      result.error &&
      /HTTP (404|410)|\b(404|410)\b|gone|not found|unsubscribed|expired/i.test(
        result.error,
      )
    ) {
      await db
        .update(pushSubscriptions)
        .set({ enabled: false })
        .where(eq(pushSubscriptions.id, sub.id));
    }
  }

  return successCount;
};

/**
 * Retry helper used by /api/notifications/[id]/retry for the PUSH channel.
 * Looks up subscription by metadata.subscriptionId and re-sends.
 */
export const sendWebPushById = async (
  metadata: any,
  eventType: string,
): Promise<{ success: boolean; error?: string }> => {
  const subscriptionId = metadata?.subscriptionId;
  if (!subscriptionId) {
    return { success: false, error: "subscriptionId missing from metadata" };
  }

  const db = useDb();
  const sub = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.id, subscriptionId))
    .get();

  if (!sub) {
    return { success: false, error: "Push subscription no longer exists" };
  }

  const payload = formatPushPayload(eventType, metadata.eventData || {});
  return await sendWebPush(revealSubscription(sub), payload);
};
