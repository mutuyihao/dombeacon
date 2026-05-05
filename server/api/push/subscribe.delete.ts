import { eq } from "drizzle-orm";
import { pushSubscriptions } from "../../db/schema";

/**
 * Unsubscribe a Web Push endpoint.
 * Body: { endpoint }
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    if (!body?.endpoint) {
      return fail("Endpoint required", 40000);
    }

    const db = useDb();
    const result = await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, body.endpoint));

    return success({ deleted: true, result });
  } catch (e: any) {
    console.error("Push unsubscribe failed:", e);
    return fail(e.message || "Unsubscribe failed", 50000);
  }
});
