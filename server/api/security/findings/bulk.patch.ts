import { recordAuditEvent } from "../../../utils/audit";
import {
  bulkUpdateRiskFindingStatus,
  normalizeFindingIds,
  validateRiskFindingStatusUpdate,
} from "../../../utils/security-findings";
import { refreshDomainRiskSummaries } from "../../../utils/risk-summary";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const idValidation = normalizeFindingIds(body?.ids);
    if (idValidation.error) {
      return fail(idValidation.error, 40000);
    }

    const statusValidation = validateRiskFindingStatusUpdate(body || {});
    if (statusValidation.error) {
      return fail(statusValidation.error, 40000);
    }

    const { status, snoozedUntil } = statusValidation;
    const db = useDb();
    const updated = await bulkUpdateRiskFindingStatus({
      db,
      ids: idValidation.ids,
      status,
      snoozedUntil,
    });
    await refreshDomainRiskSummaries(
      [...new Set(updated.map((finding) => finding.domainId))],
      { db },
    );

    await recordAuditEvent({
      event,
      eventType: "security.finding_bulk_status_update",
      outcome: "success",
      actorType: "admin",
      metadata: {
        requestedCount: idValidation.ids.length,
        updatedCount: updated.length,
        ids: idValidation.ids.slice(0, 50),
        status,
        snoozedUntil: snoozedUntil?.toISOString() || null,
      },
    });

    return success({
      updated: true,
      requestedCount: idValidation.ids.length,
      updatedCount: updated.length,
      ids: updated.map((finding) => finding.id),
    });
  } catch (error: any) {
    await recordAuditEvent({
      event,
      eventType: "security.finding_bulk_status_update",
      outcome: "failure",
      actorType: "admin",
      metadata: { reason: error?.message || String(error) },
    });
    return fail(error.message || "Failed to bulk update findings", 50000);
  }
});
