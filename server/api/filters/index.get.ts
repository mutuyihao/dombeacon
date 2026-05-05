import { desc } from "drizzle-orm";
import { savedFilters } from "../../db/schema";

/**
 * List all saved filter presets.
 */
export default defineEventHandler(async () => {
  try {
    const db = useDb();
    const rows = await db
      .select()
      .from(savedFilters)
      .orderBy(desc(savedFilters.isDefault), desc(savedFilters.createdAt))
      .all();

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      isDefault: !!r.isDefault,
      createdAt: r.createdAt,
      criteria: r.criteriaJson ? JSON.parse(r.criteriaJson) : {},
    }));

    return success({ items });
  } catch (e: any) {
    console.error("List filters failed:", e);
    return fail(e.message || "Failed to list filters", 50000);
  }
});
