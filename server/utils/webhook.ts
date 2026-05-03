import { webhookConfigs, notificationEvents } from "../db/schema";
import { eq } from "drizzle-orm";

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

/**
 * Send webhook notification
 */
export const sendWebhook = async (
  url: string,
  payload: WebhookPayload,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  } = {},
): Promise<boolean> => {
  const { method = "POST", headers = {}, timeout = 10000 } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Domain-Ops-Radar/1.0",
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `Webhook failed: ${response.status} ${response.statusText}`,
      );
      return false;
    }

    return true;
  } catch (error: any) {
    console.error("Webhook send error:", error.message);
    return false;
  }
};

/**
 * Get active webhook configurations for an event type
 */
export const getActiveWebhooks = async (
  eventType: string,
): Promise<any[]> => {
  const db = useDb();

  const configs = await db
    .select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.enabled, true));

  // Filter by event type
  return configs.filter((config) => {
    if (!config.eventTypes) return true; // Send all events if not specified

    try {
      const types = JSON.parse(config.eventTypes);
      return types.includes(eventType) || types.includes("*");
    } catch {
      return true;
    }
  });
};

/**
 * Send notification to all configured webhooks
 */
export const notifyWebhooks = async (params: {
  domainId?: number;
  actionId?: number;
  eventType: string;
  eventData: any;
}): Promise<number> => {
  const { domainId, actionId, eventType, eventData } = params;

  const webhooks = await getActiveWebhooks(eventType);
  if (webhooks.length === 0) {
    return 0;
  }

  const payload: WebhookPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data: eventData,
  };

  let successCount = 0;

  for (const webhook of webhooks) {
    const headers = webhook.headersJson
      ? JSON.parse(webhook.headersJson)
      : {};

    const success = await sendWebhook(webhook.url, payload, {
      method: webhook.method,
      headers,
    });

    // Record event
    const db = useDb();
    await db.insert(notificationEvents).values({
      domainId: domainId || null,
      actionId: actionId || null,
      eventType,
      channel: "WEBHOOK",
      status: success ? "SENT" : "FAILED",
      sentAt: success ? new Date() : null,
      failedAt: success ? null : new Date(),
      errorMessage: success ? null : "Webhook request failed",
      metadata: JSON.stringify({
        webhookId: webhook.id,
        webhookName: webhook.name,
        url: webhook.url,
      }),
      createdAt: new Date(),
    });

    if (success) successCount++;
  }

  return successCount;
};

/**
 * Test webhook configuration
 */
export const testWebhook = async (webhookId: number): Promise<boolean> => {
  const db = useDb();
  const webhook = await db
    .select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.id, webhookId))
    .get();

  if (!webhook) {
    throw new Error("Webhook not found");
  }

  const testPayload: WebhookPayload = {
    event: "TEST",
    timestamp: new Date().toISOString(),
    data: {
      message: "This is a test webhook from Domain Ops Radar",
      webhookId: webhook.id,
      webhookName: webhook.name,
    },
  };

  const headers = webhook.headersJson
    ? JSON.parse(webhook.headersJson)
    : {};

  return await sendWebhook(webhook.url, testPayload, {
    method: webhook.method,
    headers,
  });
};
