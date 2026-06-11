import { savedFilters } from "../../db/schema";
import {
  demoteDefaultSavedFilters,
  normalizeSavedFilterScope,
  serializeSavedFilter,
  withSavedFilterScope,
} from "../../utils/saved-filters";

/**
 * Save a new filter preset.
 * Body: { name, criteria, isDefault? }
 *
 * If isDefault=true, all other presets are demoted to non-default.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    if (!body?.name || typeof body.name !== "string") {
      return fail("Name required", 40000);
    }
    if (!body?.criteria || typeof body.criteria !== "object") {
      return fail("Criteria required", 40000);
    }

    const db = useDb();
    const trimmedName = body.name.trim().slice(0, 80);
    if (!trimmedName) return fail("Name required", 40000);
    const isDefault = !!body.isDefault;
    const scope = normalizeSavedFilterScope(body.scope);
    const criteria = withSavedFilterScope(body.criteria, scope);

    if (isDefault) {
      await demoteDefaultSavedFilters(db, scope);
    }

    const [row] = await db
      .insert(savedFilters)
      .values({
        name: trimmedName,
        criteriaJson: JSON.stringify(criteria),
        isDefault,
      })
      .returning();

    return success(serializeSavedFilter(row));
  } catch (e: any) {
    console.error("Save filter failed:", e);
    return fail(e.message || "Failed to save filter", 50000);
  }
});
