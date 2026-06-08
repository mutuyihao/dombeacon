import { eq } from "drizzle-orm";
import { brandWatchTerms } from "../../../db/schema";
import { recordAuditEvent } from "../../../utils/audit";
import {
  normalizeBrandWatchTermInput,
  serializeBrandWatchTerm,
} from "../../../utils/brand-watch";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    return fail("Invalid term id", 40000);
  }

  try {
    const db = useDb();
    const current = await db
      .select()
      .from(brandWatchTerms)
      .where(eq(brandWatchTerms.id, id))
      .get();
    if (!current) return fail("Brand watch term not found", 40400);

    const body = await readBody(event);
    const currentTerm = serializeBrandWatchTerm(current);
    const input = normalizeBrandWatchTermInput({
      term: body?.term ?? currentTerm.term,
      termType: body?.termType ?? currentTerm.termType,
      matchStrategy: body?.matchStrategy ?? currentTerm.matchStrategy,
      tlds: body?.tlds ?? currentTerm.tlds,
      severity: body?.severity ?? currentTerm.severity,
      enabled: body?.enabled ?? currentTerm.enabled,
      scanFrequencyHours:
        body?.scanFrequencyHours ?? currentTerm.scanFrequencyHours,
    });

    const [row] = await db
      .update(brandWatchTerms)
      .set({
        term: input.term,
        normalizedTerm: input.normalizedTerm,
        termType: input.termType,
        matchStrategy: input.matchStrategy,
        tldsJson: JSON.stringify(input.tlds),
        severity: input.severity,
        enabled: input.enabled,
        scanFrequencyHours: input.scanFrequencyHours,
        updatedAt: new Date(),
      })
      .where(eq(brandWatchTerms.id, id))
      .returning();

    await recordAuditEvent({
      event,
      eventType: "brand_watch.term_update",
      outcome: "success",
      actorType: "admin",
      metadata: {
        termId: row.id,
        normalizedTerm: row.normalizedTerm,
        termType: row.termType,
        matchStrategy: row.matchStrategy,
        severity: row.severity,
        tldCount: input.tlds.length,
        enabled: Boolean(row.enabled),
      },
    });

    return success(serializeBrandWatchTerm(row));
  } catch (error: any) {
    await recordAuditEvent({
      event,
      eventType: "brand_watch.term_update",
      outcome: "failure",
      actorType: "admin",
      metadata: {
        termId: id,
        reason: error?.message || String(error),
      },
    });
    return fail(error.message || "Failed to update brand watch term", 40000);
  }
});
