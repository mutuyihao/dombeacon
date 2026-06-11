import { eq } from "drizzle-orm";
import { serverchanConfigs } from "~/server/db/schema";
import { recordAuditEvent } from "~/server/utils/audit";
import {
  maskSecretText,
  protectSecretText,
  stringifyProtectedJson,
} from "~/server/utils/secrets";
import { normalizeServerchanOptions } from "~/server/utils/serverchan";

const normalizeEventTypes = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((eventType) => String(eventType || "").trim().toUpperCase())
        .filter(Boolean)
    : [];

export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, "id"));
    if (!id || Number.isNaN(id)) {
      return fail("Invalid ServerChan id", 40000);
    }

    const body = await readBody(event);
    const db = useDb();
    const { name, sendKey, eventTypes, enabled = true, options } = body || {};
    const normalizedEventTypes = normalizeEventTypes(eventTypes);
    const normalizedOptions = normalizeServerchanOptions(options);

    if (!name) {
      return fail("Name is required", 40000);
    }

    if (sendKey && !/^[a-zA-Z0-9]+$/.test(sendKey)) {
      return fail("Invalid SendKey format", 40000);
    }

    const updateData: Record<string, any> = {
      name,
      eventTypes: normalizedEventTypes.length
        ? JSON.stringify(normalizedEventTypes)
        : null,
      optionsJson: stringifyProtectedJson(normalizedOptions),
      enabled,
    };
    if (sendKey) updateData.sendKey = protectSecretText(sendKey);

    const [result] = await db
      .update(serverchanConfigs)
      .set(updateData)
      .where(eq(serverchanConfigs.id, id))
      .returning();

    if (!result) return fail("ServerChan config not found", 40400);

    await recordAuditEvent({
      event,
      eventType: "notifications.serverchan_update",
      outcome: "success",
      actorType: "admin",
      metadata: {
        id: result.id,
        name: result.name,
        enabled: Boolean(result.enabled),
        eventTypes: normalizedEventTypes,
        options: {
          channel: normalizedOptions.channel,
          noip: normalizedOptions.noip,
          hasOpenid: Boolean(normalizedOptions.openid),
          hasTags: Boolean(normalizedOptions.tags),
          hasTitlePrefix: Boolean(normalizedOptions.titlePrefix),
          timeoutMs: normalizedOptions.timeoutMs,
        },
      },
    });

    return success({
      id: result.id,
      name: result.name,
      sendKeyMasked: maskSecretText(result.sendKey),
      eventTypes: normalizedEventTypes,
      options: normalizedOptions,
      enabled: Boolean(result.enabled),
      createdAt: result.createdAt,
    });
  } catch (error: any) {
    return fail(error.message || "Failed to update ServerChan", 50000);
  }
});
