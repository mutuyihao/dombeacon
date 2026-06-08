import { eq } from "drizzle-orm";
import { riskFindings } from "../../../db/schema";
import { recordAuditEvent } from "../../../utils/audit";
import {
  buildRiskFindingStatusUpdate,
  validateRiskFindingStatusUpdate,
} from "../../../utils/security-findings";

export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, "id"));
    if (!id || Number.isNaN(id)) {
      return fail("Invalid finding id", 40000);
    }

    const body = await readBody(event);
    const validation = validateRiskFindingStatusUpdate(body || {});
    if (validation.error) {
      return fail(validation.error, 40000);
    }

    const { status, snoozedUntil } = validation;
    const updateData = buildRiskFindingStatusUpdate(status, snoozedUntil);

    const [updated] = await useDb()
      .update(riskFindings)
      .set(updateData)
      .where(eq(riskFindings.id, id))
      .returning();

    if (!updated) {
      return fail("Finding not found", 40400);
    }

    await recordAuditEvent({
      event,
      eventType: "security.finding_status_update",
      outcome: "success",
      actorType: "admin",
      metadata: {
        id,
        domainId: updated.domainId,
        findingType: updated.findingType,
        status,
        snoozedUntil: snoozedUntil?.toISOString() || null,
      },
    });

    return success({ updated: true });
  } catch (error: any) {
    await recordAuditEvent({
      event,
      eventType: "security.finding_status_update",
      outcome: "failure",
      actorType: "admin",
      metadata: { reason: error?.message || String(error) },
    });
    return fail(error.message || "Failed to update finding", 50000);
  }
});
