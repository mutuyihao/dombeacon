import { domains } from "../../db/schema";
import { recordAuditEvent } from "../../utils/audit";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const db = useDb();

    if (!id) return fail("ID required", 40001);

    const existing = await db
      .select({ id: domains.id, domain: domains.domain })
      .from(domains)
      .where(eq(domains.id, Number(id)))
      .get();

    await db.delete(domains).where(eq(domains.id, Number(id)));
    await recordAuditEvent({
      event,
      eventType: "domains.delete",
      outcome: "success",
      actorType: "admin",
      metadata: {
        domainId: Number(id),
        domain: existing?.domain || null,
        existed: Boolean(existing),
      },
    });
    return success({ deleted: true });
  } catch (e: any) {
    await recordAuditEvent({
      event,
      eventType: "domains.delete",
      outcome: "failure",
      actorType: "admin",
      metadata: {
        domainId: Number(getRouterParam(event, "id") || 0) || null,
        reason: e?.message || String(e),
      },
    });
    return fail(e.message || "System Error", 50000);
  }
});
