import { taskRuns } from "../../db/schema";
import { desc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const db = useDb();
  const limit = 50;

  const items = await db
    .select()
    .from(taskRuns)
    .orderBy(desc(taskRuns.startedAt))
    .limit(limit)
    .all();

  return success({
    items: items.map((i) => ({
      ...i,
      result: i.resultJson ? JSON.parse(i.resultJson) : {},
    })),
  });
});
