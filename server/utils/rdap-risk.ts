import { and, eq, inArray } from "drizzle-orm";
import { domains, riskFindings } from "../db/schema";
import { useDb } from "./db";

export type RegistrarLockStatus =
  | "LOCKED"
  | "PARTIAL"
  | "UNLOCKED"
  | "UNKNOWN";

export type RdapRiskFinding = {
  findingType: "REGISTRAR_LOCK_MISSING";
  severity: "MEDIUM";
  evidence: {
    lockStatus: Exclude<RegistrarLockStatus, "LOCKED" | "UNKNOWN">;
    statuses: string[];
    presentLocks: string[];
    missing: string[];
  };
};

type Db = ReturnType<typeof useDb>;

const MANAGED_RDAP_FINDING_TYPES = ["REGISTRAR_LOCK_MISSING"];

const TRANSFER_LOCK_KEYS = new Set([
  "clienttransferprohibited",
  "servertransferprohibited",
]);

const LOCK_KEYS = new Set([
  "clientdeleteprohibited",
  "clienttransferprohibited",
  "clientupdateprohibited",
  "serverdeleteprohibited",
  "servertransferprohibited",
  "serverupdateprohibited",
]);

const normalizeStatusKey = (status: unknown) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const normalizeStatusList = (statuses: unknown): string[] => {
  if (!Array.isArray(statuses)) return [];
  return statuses
    .map((status) => String(status || "").trim())
    .filter(Boolean);
};

export const parseRdapSummaryStatuses = (rdapSummary: unknown): string[] => {
  if (!rdapSummary) return [];
  let parsed = rdapSummary;

  if (typeof rdapSummary === "string") {
    try {
      parsed = JSON.parse(rdapSummary);
    } catch {
      return [];
    }
  }

  return normalizeStatusList((parsed as { statuses?: unknown })?.statuses);
};

export const summarizeRegistrarLockStatus = (
  statuses: unknown,
): RegistrarLockStatus => {
  const statusList = normalizeStatusList(statuses);
  if (statusList.length === 0) return "UNKNOWN";

  const keys = statusList.map(normalizeStatusKey);
  const hasTransferLock = keys.some((key) => TRANSFER_LOCK_KEYS.has(key));
  if (hasTransferLock) return "LOCKED";

  const hasOtherLock = keys.some((key) => LOCK_KEYS.has(key));
  if (hasOtherLock) return "PARTIAL";

  return "UNLOCKED";
};

export const evaluateRdapFindings = (
  statuses: unknown,
): RdapRiskFinding[] => {
  const statusList = normalizeStatusList(statuses);
  const lockStatus = summarizeRegistrarLockStatus(statusList);
  if (lockStatus === "UNKNOWN" || lockStatus === "LOCKED") return [];

  const presentLocks = statusList
    .map(normalizeStatusKey)
    .filter((key) => LOCK_KEYS.has(key))
    .sort();

  return [
    {
      findingType: "REGISTRAR_LOCK_MISSING",
      severity: "MEDIUM",
      evidence: {
        lockStatus,
        statuses: statusList,
        presentLocks,
        missing: ["clientTransferProhibited or serverTransferProhibited"],
      },
    },
  ];
};

export const syncRdapRiskFindings = async (
  domainId: number,
  rdapSummary: unknown,
  options?: { db?: Db },
) => {
  const db = options?.db ?? useDb();
  const domain = await db
    .select({ watchKind: domains.watchKind })
    .from(domains)
    .where(eq(domains.id, domainId))
    .get();

  if (domain?.watchKind !== "OWNED") {
    return {
      skipped: true,
      findings: [],
      registrarLockStatus: "UNKNOWN" as RegistrarLockStatus,
    };
  }

  const statuses = parseRdapSummaryStatuses(rdapSummary);
  const findings = evaluateRdapFindings(statuses);
  const currentTypes = new Set(findings.map((finding) => finding.findingType));
  const now = new Date();

  const existingRows = await db
    .select()
    .from(riskFindings)
    .where(
      and(
        eq(riskFindings.domainId, domainId),
        inArray(riskFindings.findingType, MANAGED_RDAP_FINDING_TYPES),
      ),
    )
    .all();

  for (const finding of findings) {
    const existing = existingRows.find(
      (row) =>
        row.findingType === finding.findingType &&
        row.status !== "RESOLVED",
    );
    const values = {
      severity: finding.severity,
      evidenceJson: JSON.stringify(finding.evidence),
      lastSeenAt: now,
      resolvedAt: null,
    };

    if (existing) {
      await db
        .update(riskFindings)
        .set(values)
        .where(eq(riskFindings.id, existing.id));
    } else {
      await db.insert(riskFindings).values({
        domainId,
        findingType: finding.findingType,
        severity: finding.severity,
        status: "OPEN",
        evidenceJson: JSON.stringify(finding.evidence),
        firstSeenAt: now,
        lastSeenAt: now,
      });
    }
  }

  for (const existing of existingRows) {
    if (
      existing.status !== "RESOLVED" &&
      !currentTypes.has(existing.findingType)
    ) {
      await db
        .update(riskFindings)
        .set({
          status: "RESOLVED",
          resolvedAt: now,
          lastSeenAt: now,
          snoozedUntil: null,
        })
        .where(eq(riskFindings.id, existing.id));
    }
  }

  return {
    skipped: false,
    findings,
    registrarLockStatus: summarizeRegistrarLockStatus(statuses),
  };
};
