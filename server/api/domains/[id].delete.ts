import { domains } from "../../db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const db = useDb();

    if (!id) return fail("ID required", 40001);

    await db.delete(domains).where(eq(domains.id, Number(id)));
    return success({ deleted: true });
  } catch (e: any) {
    return fail(e.message || "System Error", 50000);
  }
});
