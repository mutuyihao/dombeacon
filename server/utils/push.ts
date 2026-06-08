import { eq } from "drizzle-orm";
import { pushSubscriptions, notificationEvents } from "../db/schema";
import { maskSecretText, revealSecretText } from "./secrets";

/**
 * Web Push notification helper.
 *
 * The full implementation (VAPID keys, web-push package, payload formatting)
 * is wired up in workstream 1.2 of v1.2 once `web-push` is added as a
 * dependency. This stub keeps the code that *would* fan out push messages
 * import-safe so the notification retry endpoint can call it without
 * crashing at module load.
 */

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: any;
}

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
    return { success: false, error: e.message };
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
  const domain = eventData?.domain || "";
  const titleMap: Record<string, string> = {
    WANTED_AVAILABLE: `🎉 ${domain} is available`,
    WANTED_DROPPING: `⚠️ ${domain} pending delete`,
    OWNED_EXPIRING: `⏰ ${domain} expiring soon`,
    SSL_EXPIRING: `🔒 ${domain} SSL expiring`,
    SSL_INVALID: `🔒 ${domain} SSL invalid`,
    SECURITY_FINDING_HIGH: `Security risk: ${domain}`,
    BRAND_WATCH_REGISTERED: `Brand Watch: ${domain}`,
    SCAN_FAILED: `❌ Scan failed: ${domain}`,
    DAILY_SUMMARY: `📊 Daily Summary`,
    DROPPING_ALERT: `🚨 Domains dropping`,
    STATUS_CHANGE: `🔄 ${domain} status changed`,
  };

  return {
    title: titleMap[eventType] || `DomBeacon: ${eventType}`,
    body: eventData?.message || JSON.stringify(eventData).slice(0, 200),
    icon: "/icons/icon-192.png",
    url: "/actions",
    data: { eventType, ...eventData },
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
      /410|gone|unsubscribed/i.test(result.error)
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
