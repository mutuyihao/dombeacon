import { db } from "../../db";
import { domainCosts } from "../../db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || "0");

    if (!id) {
      return fail("Invalid cost ID", 40000);
    }

    // Check if exists
    const existing = await db
      .select()
      .from(domainCosts)
      .where(eq(domainCosts.id, id))
      .limit(1);

    if (!existing.length) {
      return fail("Cost record not found", 40400);
    }

    // Delete
    await db.delete(domainCosts).where(eq(domainCosts.id, id));

    return success({ deleted: true });
  } catch (error: any) {
    console.error("Failed to delete cost:", error);
    return fail(error.message || "Failed to delete cost", 50000);
  }
});
