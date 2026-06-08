import { webhookConfigs, notificationEvents } from "../db/schema";
import { eq } from "drizzle-orm";
import { useDb } from "./db";
import { parseProtectedJson } from "./secrets";

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

export interface WebhookSendResult {
  ok: boolean;
  requestUrl: string;
  errorMessage: string | null;
  httpStatus?: number;
  truncated?: boolean;
}

const MAX_GET_DATA_ENCODED_LEN = 1500;

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
): Promise<WebhookSendResult> => {
  const { method = "POST", headers = {}, timeout = 10000 } = options;
  const upperMethod = String(method || "POST").toUpperCase();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let requestUrl = url;
  let truncated = false;

  try {
    const reqHeaders: Record<string, string> = {
      "User-Agent": "DomBeacon/1.0",
      ...headers,
    };

    const init: RequestInit = {
      method: upperMethod,
      headers: reqHeaders,
      signal: controller.signal,
    };

    if (upperMethod === "GET") {
      const u = new URL(url);
      u.searchParams.set("event", payload.event);
      u.searchParams.set("timestamp", payload.timestamp);

      const dataStr = JSON.stringify(payload.data ?? null);
      const encodedLen = encodeURIComponent(dataStr).length;
      if (encodedLen <= MAX_GET_DATA_ENCODED_LEN) {
        u.searchParams.set("data", dataStr);
      } else {
        truncated = true;
      }

      requestUrl = u.toString();
      // Important: no body for GET
    } else {
      reqHeaders["Content-Type"] = "application/json";
      init.body = JSON.stringify(payload);
    }

    const response = await fetch(requestUrl, init);

    if (!response.ok) {
      const msg = `Webhook failed: HTTP ${response.status} ${response.statusText || ""}`.trim();
      console.error(msg);
      return {
        ok: false,
        requestUrl,
        errorMessage: msg,
        httpStatus: response.status,
        truncated,
      };
    }

    return { ok: true, requestUrl, errorMessage: null, truncated };
  } catch (error: any) {
    const name = String(error?.name || "");
    const msg =
      name === "AbortError"
        ? `Webhook timeout after ${timeout}ms`
        : `Webhook send error: ${error?.message || String(error)}`;
    console.error(msg);
    return { ok: false, requestUrl, errorMessage: msg, truncated };
  } finally {
    clearTimeout(timeoutId);
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
      const normalizedTypes = Array.isArray(types)
        ? types.map((type) => String(type || "").toUpperCase())
        : [];
      return normalizedTypes.includes(eventType) || normalizedTypes.includes("*");
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
    const headers = parseProtectedJson<Record<string, string>>(
      webhook.headersJson,
      {},
    );

    const result = await sendWebhook(webhook.url, payload, {
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
      status: result.ok ? "SENT" : "FAILED",
      sentAt: result.ok ? new Date() : null,
      failedAt: result.ok ? null : new Date(),
      errorMessage: result.ok
        ? null
        : result.errorMessage || "Webhook request failed",
      metadata: JSON.stringify({
        webhookId: webhook.id,
        webhookName: webhook.name,
        url: result.requestUrl || webhook.url,
        truncated: result.truncated === true,
        httpStatus: result.httpStatus || null,
        dedupeKey: eventData?.dedupeKey || null,
      }),
      createdAt: new Date(),
    });

    if (result.ok) successCount++;
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
      message: "This is a test webhook from DomBeacon (域灯)",
      webhookId: webhook.id,
      webhookName: webhook.name,
    },
  };

  const headers = parseProtectedJson<Record<string, string>>(
    webhook.headersJson,
    {},
  );

  const result = await sendWebhook(webhook.url, testPayload, {
    method: webhook.method,
    headers,
  });

  return result.ok;
};
