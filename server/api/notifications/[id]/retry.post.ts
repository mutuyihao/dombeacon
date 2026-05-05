import { eq } from "drizzle-orm";
import {
  notificationEvents,
  webhookConfigs,
  serverchanConfigs,
} from "../../../db/schema";
import { sendMail, getTemplate } from "../../../utils/mail";
import { sendWebhook } from "../../../utils/webhook";
import {
  sendServerchan,
  formatServerchanMessage,
} from "../../../utils/serverchan";

/**
 * Retry a failed notification.
 * Reads metadata, re-sends via the same channel, and writes a new
 * notification_events row with retry_of pointing at the original event.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!id || isNaN(id)) {
    return fail("Invalid notification id", 40000);
  }

  const db = useDb();

  const original = await db
    .select()
    .from(notificationEvents)
    .where(eq(notificationEvents.id, id))
    .get();

  if (!original) {
    return fail("Notification not found", 40400);
  }

  if (original.status !== "FAILED") {
    return fail("Only failed notifications can be retried", 40901);
  }

  let metadata: any = {};
  try {
    metadata = original.metadata ? JSON.parse(original.metadata) : {};
  } catch {
    return fail("Notification metadata is invalid and cannot be retried", 40000);
  }
  const now = new Date();

  let success_ = false;
  let errorMessage: string | null = null;

  try {
    if (original.channel === "EMAIL") {
      const { templateType, ...templateData } = metadata;
      const tpl = getTemplate(templateType || "instant", templateData);
      success_ = await sendMail(tpl.subject, tpl.html, tpl.text);
    } else if (original.channel === "WEBHOOK") {
      const webhookId = metadata.webhookId;
      if (!webhookId) {
        errorMessage = "Original webhook id missing from metadata";
      } else {
        const webhook = await db
          .select()
          .from(webhookConfigs)
          .where(eq(webhookConfigs.id, webhookId))
          .get();
        if (!webhook) {
          errorMessage = "Webhook config no longer exists";
        } else {
          const headers = webhook.headersJson
            ? JSON.parse(webhook.headersJson)
            : {};
          const result = await sendWebhook(
            webhook.url,
            {
              event: original.eventType,
              timestamp: now.toISOString(),
              data: metadata.eventData || metadata,
            },
            { method: webhook.method, headers },
          );
          success_ = result.ok;
          if (!success_) errorMessage = result.errorMessage || null;
        }
      }
    } else if (original.channel === "SERVERCHAN") {
      const configId = metadata.configId;
      if (!configId) {
        errorMessage = "Original Server酱 config id missing from metadata";
      } else {
        const config = await db
          .select()
          .from(serverchanConfigs)
          .where(eq(serverchanConfigs.id, configId))
          .get();
        if (!config) {
          errorMessage = "Server酱 config no longer exists";
        } else {
          const message = metadata.eventData
            ? formatServerchanMessage(original.eventType, metadata.eventData)
            : { title: metadata.message?.title || "Retry", desp: "", short: "" };
          success_ = await sendServerchan(config.sendKey, message);
        }
      }
    } else if (original.channel === "PUSH") {
      // Web Push retry handled by push.ts (loaded lazily to avoid circular import at boot)
      const { sendWebPushById } = await import("../../../utils/push");
      const result = await sendWebPushById(metadata, original.eventType);
      success_ = result.success;
      errorMessage = result.error || null;
    } else {
      errorMessage = `Unknown channel: ${original.channel}`;
    }
  } catch (e: any) {
    errorMessage = e.message;
  }

  // Record retry as a new notification event
  const [retry] = await db
    .insert(notificationEvents)
    .values({
      domainId: original.domainId,
      actionId: original.actionId,
      eventType: original.eventType,
      channel: original.channel,
      status: success_ ? "SENT" : "FAILED",
      sentAt: success_ ? now : null,
      failedAt: success_ ? null : now,
      errorMessage: success_
        ? null
        : errorMessage || "Retry failed without specific error",
      metadata: original.metadata,
      retryOf: original.id,
      createdAt: now,
    })
    .returning();

  return success({ retry, ok: success_ });
});
