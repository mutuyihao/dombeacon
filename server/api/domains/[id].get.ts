import {
  domains,
  domainStatusLatest,
  domainStatusHistory,
  riskFindings,
  sslStatusLatest,
} from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { getDomainRiskSummary } from "../../utils/risk-summary";

const parseFindingEvidence = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return { parseError: true };
  }
};

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const db = useDb();
    const domainId = Number(id);

    const domain = await db
      .select()
      .from(domains)
      .where(eq(domains.id, domainId))
      .get();
    if (!domain) {
      return fail("Domain not found", 40401);
    }

    const latest = await db
      .select()
      .from(domainStatusLatest)
      .where(eq(domainStatusLatest.domainId, domainId))
      .get();

    const sslLatest = await db
      .select()
      .from(sslStatusLatest)
      .where(eq(sslStatusLatest.domainId, domainId))
      .get();

    const riskSummary = await getDomainRiskSummary(domainId);
    const securityFindings = await db
      .select()
      .from(riskFindings)
      .where(eq(riskFindings.domainId, domainId))
      .orderBy(desc(riskFindings.lastSeenAt), desc(riskFindings.id))
      .limit(20)
      .all();

    // History (paginated - first page)
    const historyLimit = 50;
    const historyRows = await db
      .select()
      .from(domainStatusHistory)
      .where(eq(domainStatusHistory.domainId, domainId))
      .orderBy(desc(domainStatusHistory.id))
      .limit(historyLimit + 1)
      .all();

    const historyHasMore = historyRows.length > historyLimit;
    const history = historyHasMore
      ? historyRows.slice(0, historyLimit)
      : historyRows;
    const historyNextCursor = historyHasMore
      ? (history[history.length - 1]?.id ?? null)
      : null;

    const parsedLatest = (() => {
      if (!latest) return null;
      let nameservers: any = [];
      try {
        nameservers = JSON.parse(latest.nameserversJson || "[]");
      } catch {
        nameservers = [];
      }

      let rdapSummary: any = null;
      if (latest.rdapSummaryJson) {
        try {
          rdapSummary = JSON.parse(latest.rdapSummaryJson);
        } catch {
          rdapSummary = null;
        }
      }

      return {
        ...latest,
        nameservers,
        rdapSummary,
      };
    })();

    return success({
      domain: {
        ...domain,
        tags: JSON.parse(domain.tagsJson || "[]"),
      },
      latest: parsedLatest,
      sslLatest,
      riskSummary,
      securityFindings: securityFindings.map((finding) => ({
        ...finding,
        evidence: parseFindingEvidence(finding.evidenceJson),
      })),
      history,
      historyNextCursor,
    });
  } catch (e: any) {
    return fail(e.message || "System Error", 50000);
  }
});
