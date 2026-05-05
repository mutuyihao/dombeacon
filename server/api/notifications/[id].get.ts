import { eq } from "drizzle-orm";
import { notificationEvents, domains } from "../../db/schema";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!id || isNaN(id)) {
    return fail("Invalid notification id", 40000);
  }

  const db = useDb();

  try {
    const item = await db
      .select({
        id: notificationEvents.id,
        domainId: notificationEvents.domainId,
        actionId: notificationEvents.actionId,
        eventType: notificationEvents.eventType,
        channel: notificationEvents.channel,
        status: notificationEvents.status,
        sentAt: notificationEvents.sentAt,
        failedAt: notificationEvents.failedAt,
        errorMessage: notificationEvents.errorMessage,
        metadata: notificationEvents.metadata,
        retryOf: notificationEvents.retryOf,
        createdAt: notificationEvents.createdAt,
        domain: domains.domain,
      })
      .from(notificationEvents)
      .leftJoin(domains, eq(notificationEvents.domainId, domains.id))
      .where(eq(notificationEvents.id, id))
      .get();

    if (!item) {
      return fail("Notification not found", 40400);
    }

    return success(item);
  } catch (e: any) {
    console.error("Failed to get notification event:", e);
    return fail(e.message || "Failed to get notification", 50000);
  }
});
