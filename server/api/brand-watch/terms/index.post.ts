import { brandWatchTerms } from "../../../db/schema";
import { recordAuditEvent } from "../../../utils/audit";
import {
  normalizeBrandWatchTermInput,
  serializeBrandWatchTerm,
} from "../../../utils/brand-watch";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const input = normalizeBrandWatchTermInput(body || {});
    const now = new Date();

    const [row] = await useDb()
      .insert(brandWatchTerms)
      .values({
        term: input.term,
        normalizedTerm: input.normalizedTerm,
        termType: input.termType,
        matchStrategy: input.matchStrategy,
        tldsJson: JSON.stringify(input.tlds),
        severity: input.severity,
        enabled: input.enabled,
        scanFrequencyHours: input.scanFrequencyHours,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await recordAuditEvent({
      event,
      eventType: "brand_watch.term_create",
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
      eventType: "brand_watch.term_create",
      outcome: "failure",
      actorType: "admin",
      metadata: { reason: error?.message || String(error) },
    });
    return fail(error.message || "Failed to create brand watch term", 40000);
  }
});
