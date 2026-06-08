import { desc } from "drizzle-orm";
import {
  brandWatchCandidates,
  domains,
  riskFindings,
  taskRuns,
} from "../db/schema";
import { useDb } from "./db";

const ACTIVE_BRAND_REVIEW_STATUSES = new Set(["OPEN", "WATCHING"]);
const DNS_DRIFT_TYPES = new Set(["NAMESERVER_DRIFT", "MX_DRIFT"]);

const dateMs = (value: unknown) => {
  if (!value) return 0;
  const time = (value instanceof Date ? value : new Date(value as any)).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const toIso = (value: unknown) => {
  const time = dateMs(value);
  return time ? new Date(time).toISOString() : null;
};

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
};

const numberValue = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const buildRiskMetricsSnapshot = (params: {
  domainRows: Array<typeof domains.$inferSelect>;
  findingRows: Array<typeof riskFindings.$inferSelect>;
  candidateRows: Array<typeof brandWatchCandidates.$inferSelect>;
  now?: Date;
}) => {
  const now = params.now ?? new Date();
  const ownedDomainIds = new Set(
    params.domainRows
      .filter((row) => row.watchKind === "OWNED" && row.isActive !== false)
      .map((row) => row.id),
  );
  const openFindings = params.findingRows.filter(
    (row) => row.status === "OPEN" && ownedDomainIds.has(row.domainId),
  );
  const activeBrandRisks = params.candidateRows.filter(
    (candidate) =>
      candidate.status === "REGISTERED" &&
      ACTIVE_BRAND_REVIEW_STATUSES.has(candidate.reviewStatus || "OPEN"),
  );

  const highOpenFindings = openFindings.filter(
    (row) => row.severity === "HIGH",
  ).length;
  const registrarLockGaps = openFindings.filter(
    (row) => row.findingType === "REGISTRAR_LOCK_MISSING",
  ).length;
  const dnsDriftFindings = openFindings.filter((row) =>
    DNS_DRIFT_TYPES.has(row.findingType),
  ).length;
  const highRegisteredLookalikes = activeBrandRisks.filter(
    (row) => row.severity === "HIGH",
  ).length;

  return {
    generatedAt: now.toISOString(),
    ownedDomains: ownedDomainIds.size,
    openFindings: openFindings.length,
    highOpenFindings,
    registrarLockGaps,
    dnsDriftFindings,
    registeredLookalikes: activeBrandRisks.length,
    highRegisteredLookalikes,
    ctRegisteredLookalikes: activeBrandRisks.filter((row) => row.source === "ct")
      .length,
    rdapRegisteredLookalikes: activeBrandRisks.filter(
      (row) => row.source === "rdap",
    ).length,
    totalRiskSignals: openFindings.length + activeBrandRisks.length,
    highRiskSignals: highOpenFindings + highRegisteredLookalikes,
    riskPressureScore:
      highOpenFindings * 5 +
      (openFindings.length - highOpenFindings) * 2 +
      registrarLockGaps * 3 +
      dnsDriftFindings * 2 +
      highRegisteredLookalikes * 5 +
      (activeBrandRisks.length - highRegisteredLookalikes) * 2,
  };
};

export const getCurrentRiskMetricsSnapshot = async (options?: {
  db?: ReturnType<typeof useDb>;
  now?: Date;
}) => {
  const db = options?.db ?? useDb();
  const [domainRows, findingRows, candidateRows] = await Promise.all([
    db.select().from(domains).all(),
    db.select().from(riskFindings).all(),
    db.select().from(brandWatchCandidates).all(),
  ]);

  return buildRiskMetricsSnapshot({
    domainRows,
    findingRows,
    candidateRows,
    now: options?.now,
  });
};

const normalizeHistoryMetrics = (value: any) => {
  if (!value || typeof value !== "object") return null;
  return {
    generatedAt: String(value.generatedAt || ""),
    ownedDomains: numberValue(value.ownedDomains),
    openFindings: numberValue(value.openFindings),
    highOpenFindings: numberValue(value.highOpenFindings),
    registrarLockGaps: numberValue(value.registrarLockGaps),
    dnsDriftFindings: numberValue(value.dnsDriftFindings),
    registeredLookalikes: numberValue(value.registeredLookalikes),
    highRegisteredLookalikes: numberValue(value.highRegisteredLookalikes),
    ctRegisteredLookalikes: numberValue(value.ctRegisteredLookalikes),
    rdapRegisteredLookalikes: numberValue(value.rdapRegisteredLookalikes),
    totalRiskSignals: numberValue(value.totalRiskSignals),
    highRiskSignals: numberValue(value.highRiskSignals),
    riskPressureScore: numberValue(value.riskPressureScore),
  };
};

export const getRiskMetricHistory = async (options?: {
  db?: ReturnType<typeof useDb>;
  limit?: number;
}) => {
  const db = options?.db ?? useDb();
  const limit = Math.max(1, Math.min(60, Math.floor(options?.limit || 24)));

  try {
    const rows = await db
      .select()
      .from(taskRuns)
      .orderBy(desc(taskRuns.id))
      .limit(Math.min(200, limit * 4))
      .all();

    const history = rows.map((row) => {
      const result = parseJson<Record<string, any>>(row.resultJson, {});
      const metrics = normalizeHistoryMetrics(result.riskMetrics);
      if (!metrics) return null;
      return {
        runId: row.id,
        taskName: row.taskName,
        startedAt: toIso(row.startedAt),
        finishedAt: toIso(row.finishedAt),
        metrics,
      };
    });

    return history
      .filter(
        (row): row is NonNullable<(typeof history)[number]> => Boolean(row),
      )
      .slice(0, limit)
      .reverse();
  } catch (error: any) {
    if (/no such table/i.test(String(error?.message || error))) return [];
    throw error;
  }
};
