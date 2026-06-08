import { and, desc, eq, gte, lte, lt } from "drizzle-orm";
import { brandWatchCandidates, brandWatchTerms } from "../../../db/schema";
import {
  BRAND_WATCH_REVIEW_STATUSES,
  parseJson,
  serializeBrandWatchCandidate,
  serializeBrandWatchTerm,
} from "../../../utils/brand-watch";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const queryString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

const queryDate = (value: unknown) => {
  const raw = queryString(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date filter: ${raw}`);
  }
  return date;
};

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const limit = clamp(Number(query.limit) || 50, 1, 200);
    const cursor = Number(query.cursor) || null;
    const termId = Number(query.termId) || null;
    const status = queryString(query.status);
    const severity = queryString(query.severity);
    const reviewStatus = queryString(query.reviewStatus).toUpperCase();
    const source = queryString(query.source).toLowerCase();
    const mutationType = queryString(query.mutationType);
    const firstSeenFrom = queryDate(query.firstSeenFrom);
    const firstSeenTo = queryDate(query.firstSeenTo);
    const lastSeenFrom = queryDate(query.lastSeenFrom);
    const lastSeenTo = queryDate(query.lastSeenTo);

    if (
      reviewStatus &&
      !BRAND_WATCH_REVIEW_STATUSES.includes(reviewStatus as any)
    ) {
      return fail(
        "Invalid reviewStatus. Must be OPEN, WATCHING, DISMISSED, or RESOLVED",
        40000,
      );
    }
    if (source && !["rdap", "ct"].includes(source)) {
      return fail("Invalid source. Must be rdap or ct", 40000);
    }

    const filters = [];
    if (cursor) filters.push(lt(brandWatchCandidates.id, cursor));
    if (termId) filters.push(eq(brandWatchCandidates.termId, termId));
    if (status) filters.push(eq(brandWatchCandidates.status, status));
    if (severity) filters.push(eq(brandWatchCandidates.severity, severity));
    if (reviewStatus) {
      filters.push(eq(brandWatchCandidates.reviewStatus, reviewStatus));
    }
    if (source) filters.push(eq(brandWatchCandidates.source, source));
    if (mutationType) {
      filters.push(eq(brandWatchCandidates.mutationType, mutationType));
    }
    if (firstSeenFrom) {
      filters.push(gte(brandWatchCandidates.firstSeenAt, firstSeenFrom));
    }
    if (firstSeenTo) {
      filters.push(lte(brandWatchCandidates.firstSeenAt, firstSeenTo));
    }
    if (lastSeenFrom) {
      filters.push(gte(brandWatchCandidates.lastSeenAt, lastSeenFrom));
    }
    if (lastSeenTo) {
      filters.push(lte(brandWatchCandidates.lastSeenAt, lastSeenTo));
    }

    const db = useDb();
    let queryBuilder = db
      .select({
        candidate: brandWatchCandidates,
        term: brandWatchTerms,
      })
      .from(brandWatchCandidates)
      .leftJoin(
        brandWatchTerms,
        eq(brandWatchCandidates.termId, brandWatchTerms.id),
      );

    if (filters.length) {
      queryBuilder = queryBuilder.where(and(...filters)) as typeof queryBuilder;
    }

    const rows = await queryBuilder
      .orderBy(desc(brandWatchCandidates.id))
      .limit(limit + 1)
      .all();
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? (pageRows[pageRows.length - 1]?.candidate.id ?? null)
      : null;

    return success({
      items: pageRows.map((row) => ({
        ...serializeBrandWatchCandidate(row.candidate),
        evidence: parseJson(row.candidate.evidenceJson, {}),
        term: row.term ? serializeBrandWatchTerm(row.term) : null,
      })),
      nextCursor,
      limit,
    });
  } catch (error: any) {
    if (String(error?.message || "").startsWith("Invalid date filter:")) {
      return fail(error.message, 40000);
    }
    return fail(error.message || "Failed to list brand watch risks", 50000);
  }
});
