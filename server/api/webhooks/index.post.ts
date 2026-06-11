import { webhookConfigs } from "~/server/db/schema";
import { recordAuditEvent } from "~/server/utils/audit";
import { stringifyProtectedJson } from "~/server/utils/secrets";
import {
  normalizeWebhookMethod,
  validateWebhookTargetUrl,
} from "~/server/utils/webhook";

const normalizeEventTypes = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((eventType) => String(eventType || "").trim().toUpperCase())
        .filter(Boolean)
    : [];

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const db = useDb();

    const { name, url, method = "POST", headers, eventTypes, enabled = true } = body;
    const normalizedEventTypes = normalizeEventTypes(eventTypes);

    if (!name || !url) {
      return fail("Name and URL are required", 40000);
    }

    const normalizedMethod = normalizeWebhookMethod(method);
    if (!normalizedMethod) {
      return fail("Webhook method must be GET, POST, PUT, or PATCH", 40000);
    }

    const urlPolicy = await validateWebhookTargetUrl(url);
    if (!urlPolicy.ok) {
      return fail(urlPolicy.error, 40000);
    }
    const parsedUrl = urlPolicy.url;

    const [result] = await db
      .insert(webhookConfigs)
      .values({
        name,
        url: parsedUrl.toString(),
        method: normalizedMethod,
        headersJson: headers ? stringifyProtectedJson(headers) : null,
        eventTypes: normalizedEventTypes.length
          ? JSON.stringify(normalizedEventTypes)
          : null,
        enabled,
        createdAt: new Date(),
      })
      .returning();

    await recordAuditEvent({
      event,
      eventType: "notifications.webhook_create",
      outcome: "success",
      actorType: "admin",
      metadata: {
        id: result.id,
        name: result.name,
        urlHost: parsedUrl.host,
        method: result.method,
        enabled: Boolean(result.enabled),
        eventTypes: normalizedEventTypes,
        headerCount: headers ? Object.keys(headers).length : 0,
      },
    });

    return success({
      id: result.id,
      name: result.name,
      url: result.url,
      method: result.method,
      enabled: Boolean(result.enabled),
      eventTypes: normalizedEventTypes,
      headerCount: headers ? Object.keys(headers).length : 0,
      createdAt: result.createdAt,
    });
  } catch (error: any) {
    return fail(error.message || "Failed to add webhook", 50000);
  }
});
