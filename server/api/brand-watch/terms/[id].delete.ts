import { eq } from "drizzle-orm";
import { brandWatchTerms } from "../../../db/schema";
import { recordAuditEvent } from "../../../utils/audit";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    return fail("Invalid term id", 40000);
  }

  try {
    const db = useDb();
    const row = await db
      .select()
      .from(brandWatchTerms)
      .where(eq(brandWatchTerms.id, id))
      .get();
    if (!row) return fail("Brand watch term not found", 40400);

    await db.delete(brandWatchTerms).where(eq(brandWatchTerms.id, id));

    await recordAuditEvent({
      event,
      eventType: "brand_watch.term_delete",
      outcome: "success",
      actorType: "admin",
      metadata: {
        termId: row.id,
        normalizedTerm: row.normalizedTerm,
      },
    });

    return success({ deleted: true });
  } catch (error: any) {
    await recordAuditEvent({
      event,
      eventType: "brand_watch.term_delete",
      outcome: "failure",
      actorType: "admin",
      metadata: {
        termId: id,
        reason: error?.message || String(error),
      },
    });
    return fail(error.message || "Failed to delete brand watch term", 50000);
  }
});
