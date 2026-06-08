import { eq } from "drizzle-orm";
import { brandWatchTerms } from "../../../../db/schema";
import { recordAuditEvent } from "../../../../utils/audit";
import { scanBrandWatchTerm } from "../../../../utils/brand-watch";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    return fail("Invalid term id", 40000);
  }

  try {
    const body = await readBody(event).catch(() => ({}));
    const limit = Math.min(500, Math.max(1, Number(body?.limit) || 100));
    const includeCt = body?.includeCt !== false;
    const ctLimit = Math.min(200, Math.max(1, Number(body?.ctLimit) || 50));
    const db = useDb();
    const term = await db
      .select()
      .from(brandWatchTerms)
      .where(eq(brandWatchTerms.id, id))
      .get();

    if (!term) return fail("Brand watch term not found", 40400);
    if (!term.enabled) return fail("Brand watch term is disabled", 40000);

    const result = await scanBrandWatchTerm(term, {
      db,
      limit,
      includeCt,
      ctLimit,
      notify: true,
    });

    await recordAuditEvent({
      event,
      eventType: "brand_watch.term_scan",
      outcome: "success",
      actorType: "admin",
      metadata: {
        termId: id,
        checked: result.checked,
        registered: result.registered,
        unknown: result.unknown,
        error: result.error,
        ctDiscovered: result.ctDiscovered,
        ctError: result.ctError,
        notificationsSent: result.notificationsSent,
      },
    });

    return success(result);
  } catch (error: any) {
    await recordAuditEvent({
      event,
      eventType: "brand_watch.term_scan",
      outcome: "failure",
      actorType: "admin",
      metadata: {
        termId: id,
        reason: error?.message || String(error),
      },
    });
    return fail(error.message || "Failed to scan brand watch term", 50000);
  }
});
