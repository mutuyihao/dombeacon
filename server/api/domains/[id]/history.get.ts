import { domainStatusHistory } from "../../../db/schema";
import { and, desc, eq, lt } from "drizzle-orm";

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const domainId = Number(id);
    if (!Number.isFinite(domainId)) {
      return fail("Invalid domain id", 40001);
    }

    const db = useDb();
    const query = getQuery(event);
    const limit = clamp(Number(query.limit) || 50, 1, 200);
    const cursorRaw = query.cursor ? Number(query.cursor) : null;
    const cursor = cursorRaw && Number.isFinite(cursorRaw) ? cursorRaw : null;

    const where = cursor
      ? and(
          eq(domainStatusHistory.domainId, domainId),
          lt(domainStatusHistory.id, cursor),
        )
      : eq(domainStatusHistory.domainId, domainId);

    const rows = await db
      .select()
      .from(domainStatusHistory)
      .where(where)
      .orderBy(desc(domainStatusHistory.id))
      .limit(limit + 1)
      .all();

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? (pageRows[pageRows.length - 1]?.id ?? null)
      : null;

    return success({ items: pageRows, nextCursor, limit });
  } catch (e: any) {
    return fail(e.message || "System Error", 50000);
  }
});
