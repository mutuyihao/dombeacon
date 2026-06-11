import { and, inArray } from "drizzle-orm";
import { notificationEvents } from "~/server/db/schema";
import {
  buildNotificationEventConditions,
  parseNotificationRecordIds,
} from "~/server/utils/notification-records";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const ids = parseNotificationRecordIds(body?.ids);
    const conditions = buildNotificationEventConditions(
      ids.length > 0 ? {} : body,
      {
        archivedMode: "active",
        defaultStatus: ids.length > 0 ? undefined : "FAILED",
      },
    );

    if (ids.length > 0) {
      conditions.push(inArray(notificationEvents.id, ids));
    }

    const result = await useDb()
      .update(notificationEvents)
      .set({ archivedAt: new Date() })
      .where(and(...conditions));

    return success({ archived: Number((result as any)?.changes || 0) });
  } catch (e: any) {
    return fail(
      e.message || "Failed to archive notifications",
      e.apiCode || (e.statusCode === 400 ? 40000 : 50000),
    );
  }
});
