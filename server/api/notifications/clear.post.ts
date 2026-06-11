import { and, inArray } from "drizzle-orm";
import { notificationEvents } from "~/server/db/schema";
import {
  buildNotificationEventConditions,
  getNotificationArchiveMode,
  parseNotificationRecordIds,
} from "~/server/utils/notification-records";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const ids = parseNotificationRecordIds(body?.ids);
    const archivedMode = getNotificationArchiveMode(
      body?.archived,
      "active",
    ) === "archived"
      ? "archived"
      : "active";
    const conditions = buildNotificationEventConditions(
      ids.length > 0 ? {} : body,
      {
        archivedMode,
        defaultStatus: ids.length > 0 ? undefined : "FAILED",
      },
    );

    if (ids.length > 0) {
      conditions.push(inArray(notificationEvents.id, ids));
    }

    const result = await useDb()
      .delete(notificationEvents)
      .where(and(...conditions));

    return success({ cleared: Number((result as any)?.changes || 0) });
  } catch (e: any) {
    return fail(
      e.message || "Failed to clear notifications",
      e.apiCode || (e.statusCode === 400 ? 40000 : 50000),
    );
  }
});
