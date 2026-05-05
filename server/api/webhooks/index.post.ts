import { webhookConfigs } from "~/server/db/schema";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const db = useDb();

    const { name, url, method = "POST", headers, eventTypes, enabled = true } = body;

    if (!name || !url) {
      return fail("Name and URL are required", 40000);
    }

    try {
      new URL(url);
    } catch {
      return fail("Invalid URL format", 40000);
    }

    const [result] = await db
      .insert(webhookConfigs)
      .values({
        name,
        url,
        method,
        headersJson: headers ? JSON.stringify(headers) : null,
        eventTypes: eventTypes ? JSON.stringify(eventTypes) : null,
        enabled,
        createdAt: new Date(),
      })
      .returning();

    return success({
      id: result.id,
      name: result.name,
      url: result.url,
      method: result.method,
      enabled: Boolean(result.enabled),
      eventTypes: eventTypes || [],
      headerCount: headers ? Object.keys(headers).length : 0,
      createdAt: result.createdAt,
    });
  } catch (error: any) {
    return fail(error.message || "Failed to add webhook", 50000);
  }
});
