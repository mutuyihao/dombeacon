import { and, eq, inArray, isNull } from "drizzle-orm";
import { actions } from "~/server/db/schema";

const ACTION_STATUSES = new Set(["OPEN", "SNOOZED", "DISMISSED", "RESOLVED"]);

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const ids = Array.isArray(body?.ids)
      ? body.ids
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      : [];

    const conditions: any[] = [isNull(actions.archivedAt)];

    if (ids.length > 0) {
      conditions.push(inArray(actions.id, ids));
    } else {
      const status = body?.status ? String(body.status).toUpperCase() : "";
      const priority = body?.priority ? String(body.priority).toUpperCase() : "";
      const domainId = body?.domainId ? Number(body.domainId) : undefined;

      if (status) {
        if (!ACTION_STATUSES.has(status)) {
          return fail("Invalid action status", 40000);
        }
        conditions.push(eq(actions.status, status));
      }
      if (priority) {
        conditions.push(eq(actions.priority, priority));
      }
      if (domainId) {
        if (!Number.isFinite(domainId) || domainId <= 0) {
          return fail("Invalid domainId", 40000);
        }
        conditions.push(eq(actions.domainId, domainId));
      }
    }

    const result = await useDb()
      .update(actions)
      .set({ archivedAt: new Date() })
      .where(and(...conditions));

    return success({ archived: Number((result as any)?.changes || 0) });
  } catch (e: any) {
    return fail(e.message || "Failed to archive actions", 50000);
  }
});
