import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { domains, riskFindings } from "../../../db/schema";

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const queryString = (value: unknown) => {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
};

const queryStringList = (value: unknown) => {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseEvidence = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return { parseError: true };
  }
};

export default defineEventHandler(async (event) => {
  const db = useDb();
  const query = getQuery(event);
  const limit = clamp(Number(query.limit) || 50, 1, 200);
  const cursorRaw = query.cursor ? Number(query.cursor) : null;
  const cursor = cursorRaw && Number.isFinite(cursorRaw) ? cursorRaw : null;
  const status = queryString(query.status);
  const severity = queryString(query.severity);
  const findingTypes = queryStringList(query.findingType || query.findingTypes);
  const domainIdRaw = query.domainId ? Number(query.domainId) : null;
  const domainId =
    domainIdRaw && Number.isFinite(domainIdRaw) ? domainIdRaw : null;

  const filters = [];
  if (status) filters.push(eq(riskFindings.status, status));
  if (severity) filters.push(eq(riskFindings.severity, severity));
  if (findingTypes.length === 1) {
    filters.push(eq(riskFindings.findingType, findingTypes[0]));
  } else if (findingTypes.length > 1) {
    filters.push(inArray(riskFindings.findingType, findingTypes));
  }
  if (domainId) filters.push(eq(riskFindings.domainId, domainId));
  if (cursor) filters.push(lt(riskFindings.id, cursor));

  let q = db
    .select({
      finding: riskFindings,
      domain: {
        id: domains.id,
        domain: domains.domain,
        watchKind: domains.watchKind,
        priority: domains.priority,
      },
    })
    .from(riskFindings)
    .leftJoin(domains, eq(riskFindings.domainId, domains.id));

  const where = filters.length === 1 ? filters[0] : and(...filters);
  if (where) q = q.where(where);

  const rows = await q.orderBy(desc(riskFindings.id)).limit(limit + 1).all();
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? (pageRows[pageRows.length - 1]?.finding.id ?? null)
    : null;

  return success({
    items: pageRows.map((row) => ({
      ...row.finding,
      evidence: parseEvidence(row.finding.evidenceJson),
      domain: row.domain,
    })),
    nextCursor,
    limit,
  });
});
