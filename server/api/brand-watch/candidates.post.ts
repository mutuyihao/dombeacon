import { eq } from "drizzle-orm";
import { brandWatchTerms } from "../../db/schema";
import {
  generateBrandWatchCandidates,
  normalizeBrandWatchTermInput,
  serializeBrandWatchTerm,
} from "../../utils/brand-watch";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const termId = Number(body?.termId || 0);

    if (termId > 0) {
      const row = await useDb()
        .select()
        .from(brandWatchTerms)
        .where(eq(brandWatchTerms.id, termId))
        .get();
      if (!row) return fail("Brand watch term not found", 40400);

      const term = serializeBrandWatchTerm(row);
      const items = generateBrandWatchCandidates(term.term, {
        matchStrategy: body?.matchStrategy ?? term.matchStrategy,
        tlds: body?.tlds ?? term.tlds,
        severity: body?.severity ?? term.severity,
        limit: body?.limit,
      });

      return success({
        source: term,
        count: items.length,
        items,
      });
    }

    const input = normalizeBrandWatchTermInput(body || {});
    const items = generateBrandWatchCandidates(input.term, {
      matchStrategy: input.matchStrategy,
      tlds: input.tlds,
      severity: input.severity,
      limit: body?.limit,
    });

    return success({
      source: input,
      count: items.length,
      items,
    });
  } catch (error: any) {
    return fail(error.message || "Failed to generate candidates", 40000);
  }
});
