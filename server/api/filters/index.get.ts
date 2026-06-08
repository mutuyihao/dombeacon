import { desc } from "drizzle-orm";
import { savedFilters } from "../../db/schema";
import {
  normalizeSavedFilterScope,
  serializeSavedFilter,
} from "../../utils/saved-filters";

/**
 * List all saved filter presets.
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const scope = query.scope ? normalizeSavedFilterScope(query.scope) : "";
    const db = useDb();
    const rows = await db
      .select()
      .from(savedFilters)
      .orderBy(desc(savedFilters.isDefault), desc(savedFilters.createdAt))
      .all();

    const items = rows
      .map(serializeSavedFilter)
      .filter((item) => !scope || item.scope === scope);

    return success({ items });
  } catch (e: any) {
    console.error("List filters failed:", e);
    return fail(e.message || "Failed to list filters", 50000);
  }
});
