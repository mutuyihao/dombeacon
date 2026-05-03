import { db } from "../../db";
import { domainCosts } from "../../db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || "0");

    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Invalid cost ID",
      });
    }

    // Check if exists
    const existing = await db
      .select()
      .from(domainCosts)
      .where(eq(domainCosts.id, id))
      .limit(1);

    if (!existing.length) {
      throw createError({
        statusCode: 404,
        message: "Cost record not found",
      });
    }

    // Delete
    await db.delete(domainCosts).where(eq(domainCosts.id, id));

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Failed to delete cost:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to delete cost",
    });
  }
});
