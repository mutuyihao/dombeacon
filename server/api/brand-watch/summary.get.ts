import { brandWatchCandidates, brandWatchTerms } from "../../db/schema";

const countBy = (rows: any[], key: string) =>
  rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row?.[key] || "UNKNOWN");
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

export default defineEventHandler(async () => {
  try {
    const db = useDb();
    const [terms, candidates] = await Promise.all([
      db.select().from(brandWatchTerms).all(),
      db.select().from(brandWatchCandidates).all(),
    ]);

    const statusCounts = countBy(candidates, "status");
    const severityCounts = countBy(candidates, "severity");
    const reviewCounts = countBy(candidates, "reviewStatus");
    const scannedTerms = terms
      .map((term) => term.lastScannedAt)
      .filter(Boolean)
      .map((value) => new Date(value as any))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    return success({
      termsTotal: terms.length,
      enabledTerms: terms.filter((term) => term.enabled).length,
      candidatesTotal: candidates.length,
      registered: statusCounts.REGISTERED || 0,
      available: statusCounts.AVAILABLE || 0,
      unknown: statusCounts.UNKNOWN || 0,
      error: statusCounts.ERROR || 0,
      high: severityCounts.HIGH || 0,
      medium: severityCounts.MEDIUM || 0,
      low: severityCounts.LOW || 0,
      openReview: reviewCounts.OPEN || 0,
      watchingReview: reviewCounts.WATCHING || 0,
      dismissedReview: reviewCounts.DISMISSED || 0,
      resolvedReview: reviewCounts.RESOLVED || 0,
      lastScannedAt: scannedTerms[0]?.toISOString() || null,
    });
  } catch (error: any) {
    return fail(error.message || "Failed to summarize brand watch", 50000);
  }
});
