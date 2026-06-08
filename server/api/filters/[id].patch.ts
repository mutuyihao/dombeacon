import { eq } from "drizzle-orm";
import { savedFilters } from "../../db/schema";
import {
  demoteDefaultSavedFilters,
  getSavedFilterScope,
  normalizeSavedFilterScope,
  parseSavedFilterCriteria,
  serializeSavedFilter,
  withSavedFilterScope,
} from "../../utils/saved-filters";

/**
 * Update a saved filter preset.
 * Body: { name?, criteria?, isDefault? }
 *
 * If isDefault is set true, demotes all other presets first.
 */
export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, "id"));
    if (!id || isNaN(id)) {
      return fail("Invalid filter id", 40000);
    }

    const body = await readBody(event);
    const db = useDb();
    const current = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, id))
      .get();
    if (!current) return fail("Filter not found", 40400);

    const currentCriteria = parseSavedFilterCriteria(current.criteriaJson);
    const scope = normalizeSavedFilterScope(
      body?.scope ||
        body?.criteria?._scope ||
        body?.criteria?.scope ||
        getSavedFilterScope(currentCriteria),
    );

    const updates: Record<string, any> = {};
    if (typeof body?.name === "string") {
      const name = body.name.trim().slice(0, 80);
      if (!name) return fail("Name required", 40000);
      updates.name = name;
    }
    if (body?.criteria && typeof body.criteria === "object") {
      updates.criteriaJson = JSON.stringify(withSavedFilterScope(body.criteria, scope));
    } else if (body?.scope) {
      updates.criteriaJson = JSON.stringify(
        withSavedFilterScope(currentCriteria, scope),
      );
    }
    if (typeof body?.isDefault === "boolean") {
      updates.isDefault = body.isDefault;
    }

    if (Object.keys(updates).length === 0) {
      return fail("No updates provided", 40000);
    }

    const nextDefault =
      typeof updates.isDefault === "boolean"
        ? updates.isDefault
        : !!current.isDefault;
    if (nextDefault) {
      await demoteDefaultSavedFilters(db, scope, id);
    }

    await db.update(savedFilters).set(updates).where(eq(savedFilters.id, id));

    const fresh = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, id))
      .get();

    if (!fresh) return fail("Filter not found after update", 40400);

    return success(serializeSavedFilter(fresh));
  } catch (e: any) {
    console.error("Update filter failed:", e);
    return fail(e.message || "Failed to update filter", 50000);
  }
});
