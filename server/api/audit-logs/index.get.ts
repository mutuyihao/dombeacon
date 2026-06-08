import { and, desc, eq, lt } from "drizzle-orm";
import { auditLogs } from "../../db/schema";

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const queryString = (value: unknown) => {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
};

const parseMetadata = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return { parseError: true };
  }
};

export default defineEventHandler(async (event) => {
  const db = useDb();
  const query = getQuery(event);
  const limit = clamp(Number(query.limit) || 50, 1, 200);
  const cursorRaw = query.cursor ? Number(query.cursor) : null;
  const cursor = cursorRaw && Number.isFinite(cursorRaw) ? cursorRaw : null;
  const eventType = queryString(query.eventType);
  const outcome = queryString(query.outcome);

  const filters = [];
  if (eventType) filters.push(eq(auditLogs.eventType, eventType));
  if (outcome) filters.push(eq(auditLogs.outcome, outcome));
  if (cursor) filters.push(lt(auditLogs.id, cursor));

  let q = db.select().from(auditLogs);
  const where = filters.length === 1 ? filters[0] : and(...filters);
  if (where) q = q.where(where);

  const rows = await q.orderBy(desc(auditLogs.id)).limit(limit + 1).all();
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? (pageRows[pageRows.length - 1]?.id ?? null)
    : null;

  return success({
    items: pageRows.map((row) => ({
      ...row,
      metadata: parseMetadata(row.metadata),
    })),
    nextCursor,
    limit,
  });
});
