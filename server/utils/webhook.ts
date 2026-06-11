import { webhookConfigs, notificationEvents } from "../db/schema";
import { eq } from "drizzle-orm";
import { useDb } from "./db";
import { getBooleanEnv } from "./env";
import { parseProtectedJson } from "./secrets";
import { isBlockedPrivateOrReservedAddress } from "./ip-guard";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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
const ALLOWED_WEBHOOK_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_WEBHOOK_METHODS = new Set(["GET", "POST", "PUT", "PATCH"]);

export type ResolvedWebhookAddress = {
  address: string;
  family: 4 | 6;
};

export type WebhookResolveHost = (
  hostname: string,
) => Promise<ResolvedWebhookAddress[]>;

export type WebhookUrlPolicyResult =
  | { ok: true; url: URL }
  | { ok: false; error: string };

export const allowsPrivateWebhookTargets = () =>
  getBooleanEnv("ALLOW_PRIVATE_WEBHOOK_TARGETS");

const defaultResolveWebhookHost: WebhookResolveHost = async (hostname) => {
  const lookupHostname = normalizeUrlHostname(hostname);
  const literalFamily = isIP(lookupHostname);
  if (literalFamily) {
    return [{ address: lookupHostname, family: literalFamily as 4 | 6 }];
  }

  const addresses = await lookup(lookupHostname, { all: true, verbatim: true });
  return addresses.map((entry) => ({
    address: entry.address,
    family: entry.family as 4 | 6,
  }));
};

export const isBlockedWebhookAddress = (address: string) => {
  return isBlockedPrivateOrReservedAddress(address);
};

const isLoopbackHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return (
    normalized === "localhost" ||
    normalized === "localhost.localdomain" ||
    normalized.endsWith(".localhost")
  );
};

const normalizeUrlHostname = (hostname: string) =>
  hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

export const normalizeWebhookMethod = (method: unknown) => {
  const normalized = String(method || "POST").trim().toUpperCase();
  return ALLOWED_WEBHOOK_METHODS.has(normalized) ? normalized : "";
};

export const validateWebhookTargetUrl = async (
  value: unknown,
  options: {
    allowPrivateTargets?: boolean;
    resolveHost?: WebhookResolveHost;
  } = {},
): Promise<WebhookUrlPolicyResult> => {
  let url: URL;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    return { ok: false, error: "Invalid URL format" };
  }

  if (!ALLOWED_WEBHOOK_PROTOCOLS.has(url.protocol)) {
    return { ok: false, error: "Webhook URL must use http or https" };
  }

  const hostname = normalizeUrlHostname(url.hostname);
  if (!hostname) {
    return { ok: false, error: "Webhook URL host is required" };
  }

  const allowPrivateTargets =
    options.allowPrivateTargets ?? allowsPrivateWebhookTargets();
  if (allowPrivateTargets) {
    return { ok: true, url };
  }

  if (isLoopbackHostname(hostname)) {
    return {
      ok: false,
      error:
        "Webhook URL points to a private or reserved target. Set ALLOW_PRIVATE_WEBHOOK_TARGETS=true to allow LAN destinations.",
    };
  }

  const resolveHost = options.resolveHost ?? defaultResolveWebhookHost;
  let addresses: ResolvedWebhookAddress[];
  try {
    addresses = await resolveHost(hostname);
  } catch {
    return { ok: false, error: "Webhook URL host could not be resolved" };
  }

  if (!addresses.length) {
    return { ok: false, error: "Webhook URL host resolved no addresses" };
  }

  const blocked = addresses.find((entry) =>
    isBlockedWebhookAddress(entry.address),
  );
  if (blocked) {
    return {
      ok: false,
      error:
        "Webhook URL points to a private or reserved target. Set ALLOW_PRIVATE_WEBHOOK_TARGETS=true to allow LAN destinations.",
    };
  }

  return { ok: true, url };
};

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
    allowPrivateTargets?: boolean;
    resolveHost?: WebhookResolveHost;
  } = {},
): Promise<WebhookSendResult> => {
  const { method = "POST", headers = {}, timeout = 10000 } = options;
  const upperMethod = normalizeWebhookMethod(method);
  if (!upperMethod) {
    return {
      ok: false,
      requestUrl: String(url || ""),
      errorMessage: "Webhook method must be GET, POST, PUT, or PATCH",
    };
  }

  const policy = await validateWebhookTargetUrl(url, {
    allowPrivateTargets: options.allowPrivateTargets,
    resolveHost: options.resolveHost,
  });
  if (!policy.ok) {
    return {
      ok: false,
      requestUrl: String(url || ""),
      errorMessage: policy.error,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let requestUrl = policy.url.toString();
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
      redirect: "manual",
    };

    if (upperMethod === "GET") {
      const u = new URL(policy.url);
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

    if (response.status >= 300 && response.status < 400) {
      const msg = "Webhook redirects are not followed";
      return {
        ok: false,
        requestUrl,
        errorMessage: msg,
        httpStatus: response.status,
        truncated,
      };
    }

    if (!response.ok) {
      const msg = `Webhook failed: HTTP ${response.status} ${response.statusText || ""}`.trim();
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
    .where(eq(webhookConfigs.enabled, true))
    .all();

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
