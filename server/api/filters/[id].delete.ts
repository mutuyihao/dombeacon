import { eq } from "drizzle-orm";
import { savedFilters } from "../../db/schema";

/**
 * Delete a saved filter preset.
 */
export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, "id"));
    if (!id || isNaN(id)) {
      return fail("Invalid filter id", 40000);
    }

    const db = useDb();
    await db.delete(savedFilters).where(eq(savedFilters.id, id));

    return success({ deleted: true });
  } catch (e: any) {
    console.error("Delete filter failed:", e);
    return fail(e.message || "Failed to delete filter", 50000);
  }
});
