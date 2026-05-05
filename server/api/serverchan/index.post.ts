import { serverchanConfigs } from "~/server/db/schema";

const maskSendKey = (sendKey: string | null | undefined) => {
  if (!sendKey || sendKey.length < 8) return "****";
  return `${sendKey.slice(0, 4)}****${sendKey.slice(-4)}`;
};

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const db = useDb();

    const { name, sendKey, eventTypes, enabled = true } = body;

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
        sendKey,
        eventTypes: eventTypes ? JSON.stringify(eventTypes) : null,
        enabled,
        createdAt: new Date(),
      })
      .returning();

    return success({
      id: result.id,
      name: result.name,
      sendKeyMasked: maskSendKey(result.sendKey),
      eventTypes: eventTypes || [],
      enabled: Boolean(result.enabled),
      createdAt: result.createdAt,
    });
  } catch (error: any) {
    return fail(error.message || "Failed to add ServerChan", 50000);
  }
});
