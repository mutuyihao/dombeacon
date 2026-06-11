import { desc } from "drizzle-orm";
import { domains, riskFindings } from "../db/schema";
import { useDb } from "./db";
import {
  buildRiskMetricsSnapshot,
  getRiskMetricHistory,
} from "./risk-metrics";
import { calculateRiskScore, highestOpenSeverity } from "./risk-summary";

const DNS_DRIFT_TYPES = new Set(["NAMESERVER_DRIFT", "MX_DRIFT"]);
const DEFAULT_WINDOW_DAYS = 7;

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const dateMs = (value: unknown) => {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value as any);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

const toIso = (value: unknown) => {
  const time = dateMs(value);
  return time ? new Date(time).toISOString() : null;
};

const countBy = <T>(rows: T[], getKey: (row: T) => string | null | undefined) =>
  rows.reduce<Record<string, number>>((acc, row) => {
    const key = getKey(row) || "UNKNOWN";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

export const getSecurityDashboardSummary = async (options?: {
  db?: ReturnType<typeof useDb>;
  now?: Date;
  windowDays?: number;
  limit?: number;
}) => {
  const db = options?.db ?? useDb();
  const now = options?.now ?? new Date();
  const windowDays = Math.max(1, Math.floor(options?.windowDays || DEFAULT_WINDOW_DAYS));
  const limit = Math.max(1, Math.min(20, Math.floor(options?.limit || 8)));
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const [domainRows, findingRows] = await Promise.all([
    db.select().from(domains).all(),
    db
      .select()
      .from(riskFindings)
      .orderBy(desc(riskFindings.lastSeenAt), desc(riskFindings.id))
      .all(),
  ]);
  const [riskMetricHistory] = await Promise.all([
    getRiskMetricHistory({ db, limit: 24 }),
  ]);
  const riskMetrics = buildRiskMetricsSnapshot({
    domainRows,
    findingRows,
    now,
  });

  const domainById = new Map(domainRows.map((row) => [row.id, row]));
  const ownedDomains = domainRows.filter(
    (row) => row.watchKind === "OWNED" && row.isActive !== false,
  );
  const ownedDomainIds = new Set(ownedDomains.map((row) => row.id));
  const openFindings = findingRows.filter(
    (row) => row.status === "OPEN" && ownedDomainIds.has(row.domainId),
  );

  const newOpenFindings = openFindings.filter(
    (row) => dateMs(row.firstSeenAt || row.lastSeenAt) >= cutoff.getTime(),
  );

  const registrarLockGaps = openFindings.filter(
    (row) => row.findingType === "REGISTRAR_LOCK_MISSING",
  );
  const dnsDriftFindings = openFindings.filter((row) =>
    DNS_DRIFT_TYPES.has(row.findingType),
  );

  const findingsByDomain = new Map<
    number,
    Array<{ severity: string; status: string; findingType: string }>
  >();
  openFindings.forEach((finding) => {
    const rows = findingsByDomain.get(finding.domainId) || [];
    rows.push({
      severity: finding.severity,
      status: finding.status,
      findingType: finding.findingType,
    });
    findingsByDomain.set(finding.domainId, rows);
  });

  const topRiskDomains = [...findingsByDomain.entries()]
    .map(([domainId, findings]) => {
      const domain = domainById.get(domainId);
      return {
        domainId,
        domain: domain?.domain || null,
        priority: domain?.priority || "MEDIUM",
        riskScore: calculateRiskScore(findings),
        openFindingsCount: findings.length,
        highestSeverity: highestOpenSeverity(findings),
        findingTypes: [...new Set(findings.map((finding) => finding.findingType))],
      };
    })
    .sort(
      (left, right) =>
        right.riskScore - left.riskScore ||
        right.openFindingsCount - left.openFindingsCount ||
        String(left.domain || "").localeCompare(String(right.domain || "")),
    )
    .slice(0, limit);

  const recentFindings = openFindings
    .slice()
    .sort(
      (left, right) =>
        dateMs(right.lastSeenAt || right.firstSeenAt) -
          dateMs(left.lastSeenAt || left.firstSeenAt) ||
        right.id - left.id,
    )
    .slice(0, limit)
    .map((finding) => ({
      id: finding.id,
      domainId: finding.domainId,
      domain: domainById.get(finding.domainId)?.domain || null,
      findingType: finding.findingType,
      severity: finding.severity,
      status: finding.status,
      evidence: parseJson(finding.evidenceJson, {}),
      firstSeenAt: toIso(finding.firstSeenAt),
      lastSeenAt: toIso(finding.lastSeenAt),
    }));

  return {
    generatedAt: now.toISOString(),
    windowDays,
    ownedDomains: riskMetrics.ownedDomains,
    openFindings: riskMetrics.openFindings,
    highOpenFindings: riskMetrics.highOpenFindings,
    registrarLockGaps: riskMetrics.registrarLockGaps,
    dnsDriftFindings: riskMetrics.dnsDriftFindings,
    riskMetrics,
    riskMetricHistory,
    findingTypeCounts: countBy(openFindings, (row) => row.findingType),
    findingSeverityCounts: countBy(openFindings, (row) => row.severity),
    trends: {
      windowDays,
      openFindings: newOpenFindings.length,
      registrarLockGaps: newOpenFindings.filter(
        (row) => row.findingType === "REGISTRAR_LOCK_MISSING",
      ).length,
      dnsDriftFindings: newOpenFindings.filter((row) =>
        DNS_DRIFT_TYPES.has(row.findingType),
      ).length,
    },
    topRiskDomains,
    recentFindings,
  };
};
