import { eq, ne, and } from "drizzle-orm";
import { savedFilters } from "../../db/schema";

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

    const updates: Record<string, any> = {};
    if (typeof body?.name === "string") {
      updates.name = body.name.trim().slice(0, 80);
    }
    if (body?.criteria && typeof body.criteria === "object") {
      updates.criteriaJson = JSON.stringify(body.criteria);
    }
    if (typeof body?.isDefault === "boolean") {
      updates.isDefault = body.isDefault;
    }

    if (Object.keys(updates).length === 0) {
      return fail("No updates provided", 40000);
    }

    if (updates.isDefault === true) {
      await db
        .update(savedFilters)
        .set({ isDefault: false })
        .where(and(eq(savedFilters.isDefault, true), ne(savedFilters.id, id)));
    }

    await db.update(savedFilters).set(updates).where(eq(savedFilters.id, id));

    const fresh = await db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, id))
      .get();

    if (!fresh) return fail("Filter not found after update", 40400);

    return success({
      id: fresh.id,
      name: fresh.name,
      isDefault: !!fresh.isDefault,
      createdAt: fresh.createdAt,
      criteria: fresh.criteriaJson ? JSON.parse(fresh.criteriaJson) : {},
    });
  } catch (e: any) {
    console.error("Update filter failed:", e);
    return fail(e.message || "Failed to update filter", 50000);
  }
});
