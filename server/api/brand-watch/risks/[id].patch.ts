import { eq } from "drizzle-orm";
import { brandWatchCandidates } from "../../../db/schema";
import { recordAuditEvent } from "../../../utils/audit";
import {
  BRAND_WATCH_REVIEW_STATUSES,
  serializeBrandWatchCandidate,
} from "../../../utils/brand-watch";

const normalizeNote = (value: unknown) => {
  const note = String(value || "").trim();
  return note ? note.slice(0, 1000) : null;
};

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    return fail("Invalid candidate id", 40000);
  }

  try {
    const body = await readBody(event);
    const reviewStatus = String(
      body?.reviewStatus ?? body?.status ?? "",
    ).trim().toUpperCase();

    if (!BRAND_WATCH_REVIEW_STATUSES.includes(reviewStatus as any)) {
      return fail(
        "Invalid reviewStatus. Must be OPEN, WATCHING, DISMISSED, or RESOLVED",
        40000,
      );
    }

    const reviewNote =
      Object.prototype.hasOwnProperty.call(body || {}, "reviewNote") ||
      Object.prototype.hasOwnProperty.call(body || {}, "note")
        ? normalizeNote(body?.reviewNote ?? body?.note)
        : undefined;

    const now = new Date();
    const updateData = {
      reviewStatus,
      ...(reviewNote !== undefined ? { reviewNote } : {}),
      reviewedAt: now,
      reviewedBy: "admin",
      updatedAt: now,
    };

    const [row] = await useDb()
      .update(brandWatchCandidates)
      .set(updateData)
      .where(eq(brandWatchCandidates.id, id))
      .returning();

    if (!row) {
      return fail("Brand watch candidate not found", 40400);
    }

    await recordAuditEvent({
      event,
      eventType: "brand_watch.candidate_review_update",
      outcome: "success",
      actorType: "admin",
      metadata: {
        candidateId: row.id,
        termId: row.termId,
        domain: row.domain,
        reviewStatus,
        hasReviewNote: Boolean(row.reviewNote),
      },
    });

    return success(serializeBrandWatchCandidate(row));
  } catch (error: any) {
    await recordAuditEvent({
      event,
      eventType: "brand_watch.candidate_review_update",
      outcome: "failure",
      actorType: "admin",
      metadata: {
        candidateId: id,
        reason: error?.message || String(error),
      },
    });
    return fail(error.message || "Failed to update brand watch candidate", 50000);
  }
});
