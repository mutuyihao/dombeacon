import { eq, desc, and, sql } from "drizzle-orm";
import { notificationEvents, domains } from "../../db/schema";
import {
  buildNotificationEventConditions,
  getNotificationArchiveMode,
} from "../../utils/notification-records";

/**
 * List notification events with filtering and pagination.
 * Query params:
 *  - page (default 1)
 *  - limit (default 50, max 200)
 *  - channel: EMAIL | WEBHOOK | SERVERCHAN | PUSH
 *  - status: SENT | FAILED | PENDING
 *  - eventType: any string
 *  - domainId: number
 *  - from: ISO timestamp
 *  - to: ISO timestamp
 *  - archived: 1 | true | archived to show archived records; all to include both
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const db = useDb();

  try {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const offset = (page - 1) * limit;

    const conditions = buildNotificationEventConditions(query, {
      archivedMode: getNotificationArchiveMode(query.archived, "active"),
    });

    const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

    const itemsQuery = db
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
        archivedAt: notificationEvents.archivedAt,
        createdAt: notificationEvents.createdAt,
        domain: domains.domain,
      })
      .from(notificationEvents)
      .leftJoin(domains, eq(notificationEvents.domainId, domains.id))
      .orderBy(desc(notificationEvents.createdAt))
      .limit(limit)
      .offset(offset);

    const items = whereExpr
      ? await itemsQuery.where(whereExpr).all()
      : await itemsQuery.all();

    // Total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(notificationEvents);
    const totalRow = whereExpr
      ? await countQuery.where(whereExpr).get()
      : await countQuery.get();
    const total = Number(totalRow?.count || 0);

    return success({ items, total, page, limit });
  } catch (e: any) {
    console.error("Failed to list notification events:", e);
    return fail(
      e.message || "Failed to list notifications",
      e.apiCode || (e.statusCode === 400 ? 40000 : 50000),
    );
  }
});
