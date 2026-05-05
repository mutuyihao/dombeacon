import { eq } from "drizzle-orm";
import { savedFilters } from "../../db/schema";

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
    const isDefault = !!body.isDefault;

    if (isDefault) {
      await db
        .update(savedFilters)
        .set({ isDefault: false })
        .where(eq(savedFilters.isDefault, true));
    }

    const [row] = await db
      .insert(savedFilters)
      .values({
        name: trimmedName,
        criteriaJson: JSON.stringify(body.criteria),
        isDefault,
      })
      .returning();

    return success({
      id: row.id,
      name: row.name,
      isDefault: !!row.isDefault,
      criteria: body.criteria,
      createdAt: row.createdAt,
    });
  } catch (e: any) {
    console.error("Save filter failed:", e);
    return fail(e.message || "Failed to save filter", 50000);
  }
});
