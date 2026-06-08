import { serverchanConfigs } from "~/server/db/schema";
import { recordAuditEvent } from "~/server/utils/audit";
import { maskSecretText, protectSecretText } from "~/server/utils/secrets";

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

    const { name, sendKey, eventTypes, enabled = true } = body;
    const normalizedEventTypes = normalizeEventTypes(eventTypes);

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
      },
    });

    return success({
      id: result.id,
      name: result.name,
      sendKeyMasked: maskSecretText(result.sendKey),
      eventTypes: normalizedEventTypes,
      enabled: Boolean(result.enabled),
      createdAt: result.createdAt,
    });
  } catch (error: any) {
    return fail(error.message || "Failed to add ServerChan", 50000);
  }
});
