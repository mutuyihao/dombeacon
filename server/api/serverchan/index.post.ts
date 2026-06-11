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
    const body = await readBody(event);
    const db = useDb();

    const { name, sendKey, eventTypes, enabled = true, options } = body;
    const normalizedEventTypes = normalizeEventTypes(eventTypes);
    const normalizedOptions = normalizeServerchanOptions(options);

    if (!name || !sendKey) {
      return fail("Name and SendKey are required", 40000);
    }

    if (!/^[a-zA-Z0-9]+$/.test(sendKey)) {
      return fail("Invalid SendKey format", 40000);
    }

    const [result] = await db
      .insert(serverchanConfigs)
      .values({
        name,
        sendKey: protectSecretText(sendKey),
        eventTypes: normalizedEventTypes.length
          ? JSON.stringify(normalizedEventTypes)
          : null,
        optionsJson: stringifyProtectedJson(normalizedOptions),
        enabled,
        createdAt: new Date(),
      })
      .returning();

    await recordAuditEvent({
      event,
      eventType: "notifications.serverchan_create",
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
    return fail(error.message || "Failed to add ServerChan", 50000);
  }
});
