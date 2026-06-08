import { desc, inArray } from "drizzle-orm";
import { dnsSnapshots, domainStatusLatest, riskFindings } from "../db/schema";
import { useDb } from "./db";
import {
  parseRdapSummaryStatuses,
  summarizeRegistrarLockStatus,
  type RegistrarLockStatus,
} from "./rdap-risk";
import { parseDnsRecordsJson, type DnsSecurityRecords } from "./security-scan";

export type DomainRiskSummary = {
  riskScore: number;
  openFindingsCount: number;
  highestSeverity: "HIGH" | "MEDIUM" | "LOW" | null;
  lastSecurityScanAt: Date | null;
  dnssecStatus: "SIGNED" | "UNSIGNED" | "UNKNOWN";
  dmarcPolicy: "reject" | "quarantine" | "none" | "missing" | "unknown";
  registrarLockStatus: RegistrarLockStatus;
  spfConfigured: boolean;
  caaConfigured: boolean;
  bimiConfigured: boolean;
};

const severityWeight: Record<string, number> = {
  HIGH: 40,
  MEDIUM: 20,
  LOW: 5,
};

const severityRank: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const createEmptyRiskSummary = (): DomainRiskSummary => ({
  riskScore: 0,
  openFindingsCount: 0,
  highestSeverity: null,
  lastSecurityScanAt: null,
  dnssecStatus: "UNKNOWN",
  dmarcPolicy: "unknown",
  registrarLockStatus: "UNKNOWN",
  spfConfigured: false,
  caaConfigured: false,
  bimiConfigured: false,
});

export const calculateRiskScore = (
  findings: Array<{ severity: string; status: string }>,
) => {
  const openFindings = findings.filter((finding) => finding.status === "OPEN");
  return Math.min(
    100,
    openFindings.reduce(
      (score, finding) => score + (severityWeight[finding.severity] || 0),
      0,
    ),
  );
};

export const highestOpenSeverity = (
  findings: Array<{ severity: string; status: string }>,
): DomainRiskSummary["highestSeverity"] => {
  const severity = findings
    .filter((finding) => finding.status === "OPEN")
    .map((finding) => finding.severity)
    .sort(
      (left, right) => (severityRank[right] || 0) - (severityRank[left] || 0),
    )[0];
  return (severity as DomainRiskSummary["highestSeverity"]) || null;
};

const parseTagRecord = (record: string) => {
  const tags: Record<string, string> = {};
  record
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [key, ...valueParts] = part.split("=");
      if (key && valueParts.length > 0) {
        tags[key.trim().toLowerCase()] = valueParts.join("=").trim();
      }
    });
  return tags;
};

export const summarizeDnsPosture = (
  records: DnsSecurityRecords | null,
): Pick<
  DomainRiskSummary,
  | "dnssecStatus"
  | "dmarcPolicy"
  | "spfConfigured"
  | "caaConfigured"
  | "bimiConfigured"
> => {
  if (!records) {
    return {
      dnssecStatus: "UNKNOWN",
      dmarcPolicy: "unknown",
      spfConfigured: false,
      caaConfigured: false,
      bimiConfigured: false,
    };
  }

  const dmarcRecord = records.dmarc[0] || "";
  const dmarcTags = dmarcRecord ? parseTagRecord(dmarcRecord) : {};
  const policy = String(dmarcTags.p || "").toLowerCase();
  let dmarcPolicy: DomainRiskSummary["dmarcPolicy"] = "unknown";
  if (policy === "reject" || policy === "quarantine" || policy === "none") {
    dmarcPolicy = policy;
  } else if (!dmarcRecord && !records.errors.DMARC) {
    dmarcPolicy = "missing";
  }

  return {
    dnssecStatus: records.errors.DS
      ? "UNKNOWN"
      : records.ds.length > 0
        ? "SIGNED"
        : "UNSIGNED",
    dmarcPolicy,
    spfConfigured: records.spf.length > 0,
    caaConfigured: records.caa.length > 0,
    bimiConfigured: records.bimi.length > 0,
  };
};

export const getDomainRiskSummaries = async (domainIds: number[]) => {
  const uniqueIds = [...new Set(domainIds.filter((id) => Number.isFinite(id)))];
  const summaries = new Map<number, DomainRiskSummary>();
  uniqueIds.forEach((id) => summaries.set(id, createEmptyRiskSummary()));

  if (uniqueIds.length === 0) return summaries;

  const db = useDb();
  const [findingRows, snapshotRows, rdapRows] = await Promise.all([
    db
      .select()
      .from(riskFindings)
      .where(inArray(riskFindings.domainId, uniqueIds))
      .all(),
    db
      .select()
      .from(dnsSnapshots)
      .where(inArray(dnsSnapshots.domainId, uniqueIds))
      .orderBy(desc(dnsSnapshots.checkedAt), desc(dnsSnapshots.id))
      .all(),
    db
      .select({
        domainId: domainStatusLatest.domainId,
        rdapSummaryJson: domainStatusLatest.rdapSummaryJson,
      })
      .from(domainStatusLatest)
      .where(inArray(domainStatusLatest.domainId, uniqueIds))
      .all(),
  ]);

  const findingsByDomain = new Map<
    number,
    Array<{ severity: string; status: string }>
  >();
  findingRows.forEach((finding) => {
    const rows = findingsByDomain.get(finding.domainId) || [];
    rows.push({
      severity: finding.severity,
      status: finding.status,
    });
    findingsByDomain.set(finding.domainId, rows);
  });

  findingsByDomain.forEach((findings, domainId) => {
    const summary = summaries.get(domainId) || createEmptyRiskSummary();
    summary.openFindingsCount = findings.filter(
      (finding) => finding.status === "OPEN",
    ).length;
    summary.riskScore = calculateRiskScore(findings);
    summary.highestSeverity = highestOpenSeverity(findings);
    summaries.set(domainId, summary);
  });

  const seenSnapshots = new Set<number>();
  snapshotRows.forEach((snapshot) => {
    if (seenSnapshots.has(snapshot.domainId)) return;
    seenSnapshots.add(snapshot.domainId);

    const summary = summaries.get(snapshot.domainId) || createEmptyRiskSummary();
    const posture = summarizeDnsPosture(parseDnsRecordsJson(snapshot.recordsJson));
    summaries.set(snapshot.domainId, {
      ...summary,
      ...posture,
      lastSecurityScanAt: snapshot.checkedAt || null,
    });
  });

  rdapRows.forEach((row) => {
    const summary = summaries.get(row.domainId) || createEmptyRiskSummary();
    summaries.set(row.domainId, {
      ...summary,
      registrarLockStatus: summarizeRegistrarLockStatus(
        parseRdapSummaryStatuses(row.rdapSummaryJson),
      ),
    });
  });

  return summaries;
};

export const getDomainRiskSummary = async (domainId: number) => {
  const summaries = await getDomainRiskSummaries([domainId]);
  return summaries.get(domainId) || createEmptyRiskSummary();
};
