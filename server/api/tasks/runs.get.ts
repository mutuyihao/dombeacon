import { taskLocks, taskRuns } from "../../db/schema";
import { desc, gt, lt } from "drizzle-orm";

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export default defineEventHandler(async (event) => {
  const db = useDb();
  const query = getQuery(event);
  const limit = clamp(Number(query.limit) || 50, 1, 200);
  const cursorRaw = query.cursor ? Number(query.cursor) : null;
  const cursor = cursorRaw && Number.isFinite(cursorRaw) ? cursorRaw : null;

  let q = db.select().from(taskRuns);
  if (cursor) {
    q = q.where(lt(taskRuns.id, cursor));
  }

  const rows = await q.orderBy(desc(taskRuns.id)).limit(limit + 1).all();
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? (pageRows[pageRows.length - 1]?.id ?? null)
    : null;
  const now = new Date();
  const running = await db
    .select()
    .from(taskLocks)
    .where(gt(taskLocks.lockedUntil, now))
    .all();

  return success({
    items: pageRows.map((i) => ({
      ...i,
      result: i.resultJson ? JSON.parse(i.resultJson) : {},
    })),
    nextCursor,
    limit,
    running: running.map((i) => ({
      taskName: i.taskName,
      lockedUntil: i.lockedUntil,
      ownerId: i.ownerId,
    })),
  });
});
