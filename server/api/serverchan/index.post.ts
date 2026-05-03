import { serverchanConfigs } from "~/server/db/schema";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = useDb();

  const { name, sendKey, eventTypes, enabled = true } = body;

  if (!name || !sendKey) {
    throw createError({
      statusCode: 400,
      message: "Name and SendKey are required",
    });
  }

  // Validate SendKey format (should be alphanumeric)
  if (!/^[a-zA-Z0-9]+$/.test(sendKey)) {
    throw createError({
      statusCode: 400,
      message: "Invalid SendKey format",
    });
  }

  const result = await db
    .insert(serverchanConfigs)
    .values({
      name,
      sendKey,
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
