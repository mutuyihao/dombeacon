import { webhookConfigs } from "~/server/db/schema";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = useDb();

  const { name, url, method = "POST", headers, eventTypes, enabled = true } = body;

  if (!name || !url) {
    throw createError({
      statusCode: 400,
      message: "Name and URL are required",
    });
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw createError({
      statusCode: 400,
      message: "Invalid URL format",
    });
  }

  const result = await db
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

  return {
    success: true,
    data: result[0],
  };
});
