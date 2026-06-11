import { createHash } from "node:crypto";
import {
  resolve as dnsResolve,
  resolve4,
  resolve6,
  resolveCaa,
  resolveCname,
  resolveMx,
  resolveNs,
  resolveTxt,
} from "node:dns/promises";
import { and, desc, eq, inArray } from "drizzle-orm";
import { dnsSnapshots, riskFindings } from "../db/schema";
import { useDb } from "./db";
import { notifySecurityFinding } from "./risk-notifications";
import { refreshDomainRiskSummaries } from "./risk-summary";

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH";

export type DnsSecurityRecords = {
  domain: string;
  a: string[];
  aaaa: string[];
  cname: string[];
  ns: string[];
  mx: Array<{ exchange: string; priority: number }>;
  txt: string[];
  caa: Array<Record<string, unknown>>;
  ds: Array<Record<string, unknown>>;
  spf: string[];
  dmarc: string[];
  bimi: string[];
  errors: Record<string, string>;
};

export type EvaluatedRiskFinding = {
  findingType: string;
  severity: RiskSeverity;
  evidence: Record<string, unknown>;
};

export type DnsResolver = {
  resolve4(hostname: string): Promise<string[]>;
  resolve6(hostname: string): Promise<string[]>;
  resolveCname(hostname: string): Promise<string[]>;
  resolveMx(hostname: string): Promise<Array<{ exchange: string; priority: number }>>;
  resolveNs(hostname: string): Promise<string[]>;
  resolveTxt(hostname: string): Promise<string[][]>;
  resolveCaa(hostname: string): Promise<Array<Record<string, unknown>>>;
  resolve(hostname: string, rrtype: string): Promise<any[]>;
};

const MANAGED_FINDING_TYPES = [
  "DMARC_MISSING",
  "DMARC_WEAK_POLICY",
  "CAA_MISSING",
  "DNSSEC_UNSIGNED",
  "NAMESERVER_DRIFT",
  "MX_DRIFT",
];

const defaultResolver: DnsResolver = {
  resolve4,
  resolve6,
  resolveCname,
  resolveMx,
  resolveNs,
  resolveTxt,
  resolveCaa: resolveCaa as any,
  resolve: dnsResolve as any,
};

const normalizeHost = (value: string) =>
  value.trim().toLowerCase().replace(/\.$/, "");

const sortedStrings = (values: string[]) =>
  [...new Set(values.map(normalizeHost).filter(Boolean))].sort();

const sortedJsonRecords = (records: Array<Record<string, unknown>>) =>
  records
    .map((record) =>
      Object.fromEntries(
        Object.entries(record)
          .filter(([, value]) => value !== undefined && value !== null)
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
    )
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

const normalizeTxt = (records: string[][]) =>
  records.map((chunks) => chunks.join("").trim()).filter(Boolean).sort();

const normalizeMx = (records: Array<{ exchange: string; priority: number }>) =>
  records
    .map((record) => ({
      exchange: normalizeHost(record.exchange),
      priority: Number(record.priority) || 0,
    }))
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        left.exchange.localeCompare(right.exchange),
    );

const normalizeCaa = (records: Array<Record<string, unknown>>) =>
  sortedJsonRecords(
    records.map((record) => ({
      critical: Number(record.critical) || 0,
      issue: record.issue,
      issuewild: record.issuewild,
      iodef: record.iodef,
      contactemail: record.contactemail,
      contactphone: record.contactphone,
    })),
  );

const normalizeDs = (records: Array<Record<string, unknown>>) =>
  sortedJsonRecords(records);

const isNoDnsDataError = (error: any) => {
  const code = String(error?.code || error?.errno || "").toUpperCase();
  return [
    "ENODATA",
    "ENOTFOUND",
    "ENODOMAIN",
    "ENONAME",
    "NOTFOUND",
    "NODATA",
  ].includes(code);
};

const readRecord = async <T>(
  label: string,
  errors: Record<string, string>,
  fn: () => Promise<T>,
  fallback: T,
) => {
  try {
    return await fn();
  } catch (error: any) {
    if (!isNoDnsDataError(error)) {
      errors[label] = error?.message || String(error);
    }
    return fallback;
  }
};

export const parseDnsRecordsJson = (
  value: string | null | undefined,
): DnsSecurityRecords | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as DnsSecurityRecords;
  } catch {
    return null;
  }
};

export const buildDnsRecordHash = (records: DnsSecurityRecords) => {
  const { errors, ...recordValues } = records;
  return createHash("sha256")
    .update(JSON.stringify(recordValues))
    .digest("hex");
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

export const collectDnsSecuritySnapshot = async (
  domain: string,
  options?: { resolver?: DnsResolver },
): Promise<DnsSecurityRecords> => {
  const resolver = options?.resolver ?? defaultResolver;
  const normalizedDomain = normalizeHost(domain);
  const errors: Record<string, string> = {};

  const [
    a,
    aaaa,
    cname,
    ns,
    mx,
    txt,
    caa,
    ds,
    dmarcTxt,
    bimiTxt,
  ] = await Promise.all([
    readRecord("A", errors, () => resolver.resolve4(normalizedDomain), []),
    readRecord("AAAA", errors, () => resolver.resolve6(normalizedDomain), []),
    readRecord("CNAME", errors, () => resolver.resolveCname(normalizedDomain), []),
    readRecord("NS", errors, () => resolver.resolveNs(normalizedDomain), []),
    readRecord("MX", errors, () => resolver.resolveMx(normalizedDomain), []),
    readRecord("TXT", errors, () => resolver.resolveTxt(normalizedDomain), []),
    readRecord("CAA", errors, () => resolver.resolveCaa(normalizedDomain), []),
    readRecord("DS", errors, () => resolver.resolve(normalizedDomain, "DS"), []),
    readRecord("DMARC", errors, () => resolver.resolveTxt(`_dmarc.${normalizedDomain}`), []),
    readRecord(
      "BIMI",
      errors,
      () => resolver.resolveTxt(`default._bimi.${normalizedDomain}`),
      [],
    ),
  ]);

  const txtRecords = normalizeTxt(txt);
  const dmarc = normalizeTxt(dmarcTxt).filter((record) =>
    record.toLowerCase().includes("v=dmarc1"),
  );
  const bimi = normalizeTxt(bimiTxt).filter((record) =>
    record.toLowerCase().includes("v=bimi1"),
  );

  return {
    domain: normalizedDomain,
    a: sortedStrings(a),
    aaaa: sortedStrings(aaaa),
    cname: sortedStrings(cname),
    ns: sortedStrings(ns),
    mx: normalizeMx(mx),
    txt: txtRecords,
    caa: normalizeCaa(caa),
    ds: normalizeDs(ds),
    spf: txtRecords.filter((record) =>
      record.toLowerCase().startsWith("v=spf1"),
    ),
    dmarc,
    bimi,
    errors,
  };
};

const hasChanged = (left: unknown, right: unknown) =>
  JSON.stringify(left ?? null) !== JSON.stringify(right ?? null);

export const evaluateDnsFindings = (
  records: DnsSecurityRecords,
  previous?: DnsSecurityRecords | null,
): EvaluatedRiskFinding[] => {
  const findings: EvaluatedRiskFinding[] = [];
  const dmarcRecord = records.dmarc[0] || "";

  if (!dmarcRecord) {
    if (!records.errors.DMARC) {
      findings.push({
        findingType: "DMARC_MISSING",
        severity: "HIGH",
        evidence: {
          domain: records.domain,
          checkedRecord: `_dmarc.${records.domain}`,
        },
      });
    }
  } else {
    const dmarcTags = parseTagRecord(dmarcRecord);
    const policy = String(dmarcTags.p || "").toLowerCase();
    const percentage = Number(dmarcTags.pct || 100);
    if (!policy || policy === "none" || percentage < 100) {
      findings.push({
        findingType: "DMARC_WEAK_POLICY",
        severity: policy === "none" ? "MEDIUM" : "LOW",
        evidence: {
          domain: records.domain,
          policy: policy || null,
          pct: Number.isFinite(percentage) ? percentage : null,
          record: dmarcRecord,
        },
      });
    }
  }

  if (records.caa.length === 0 && !records.errors.CAA) {
    findings.push({
      findingType: "CAA_MISSING",
      severity: "MEDIUM",
      evidence: { domain: records.domain },
    });
  }

  if (records.ds.length === 0 && !records.errors.DS) {
    findings.push({
      findingType: "DNSSEC_UNSIGNED",
      severity: "LOW",
      evidence: { domain: records.domain },
    });
  }

  if (previous) {
    if (
      previous.ns.length > 0 &&
      !records.errors.NS &&
      hasChanged(previous.ns, records.ns)
    ) {
      findings.push({
        findingType: "NAMESERVER_DRIFT",
        severity: "MEDIUM",
        evidence: {
          domain: records.domain,
          previous: previous.ns,
          current: records.ns,
        },
      });
    }

    if (
      previous.mx.length > 0 &&
      !records.errors.MX &&
      hasChanged(previous.mx, records.mx)
    ) {
      findings.push({
        findingType: "MX_DRIFT",
        severity: "MEDIUM",
        evidence: {
          domain: records.domain,
          previous: previous.mx,
          current: records.mx,
        },
      });
    }
  }

  return findings;
};

const syncRiskFindings = async (
  domainId: number,
  findings: EvaluatedRiskFinding[],
) => {
  const db = useDb();
  const now = new Date();
  const currentTypes = new Set(findings.map((finding) => finding.findingType));
  const createdRows: Array<typeof riskFindings.$inferSelect> = [];
  const existingRows = await db
    .select()
    .from(riskFindings)
    .where(
      and(
        eq(riskFindings.domainId, domainId),
        inArray(riskFindings.findingType, MANAGED_FINDING_TYPES),
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
      const [created] = await db
        .insert(riskFindings)
        .values({
          domainId,
          findingType: finding.findingType,
          severity: finding.severity,
          status: "OPEN",
          evidenceJson: JSON.stringify(finding.evidence),
          firstSeenAt: now,
          lastSeenAt: now,
        })
        .returning();
      if (created) createdRows.push(created);
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

  return { createdRows };
};

export const scanDomainSecurity = async (
  domainId: number,
  domain: string,
  options?: { resolver?: DnsResolver; notify?: boolean },
) => {
  const db = useDb();
  const previousSnapshot = await db
    .select()
    .from(dnsSnapshots)
    .where(eq(dnsSnapshots.domainId, domainId))
    .orderBy(desc(dnsSnapshots.checkedAt))
    .limit(1)
    .get();
  const previousRecords = parseDnsRecordsJson(previousSnapshot?.recordsJson);
  const records = await collectDnsSecuritySnapshot(domain, options);
  const recordHash = buildDnsRecordHash(records);
  const errors = Object.keys(records.errors);

  const [snapshot] = await db
    .insert(dnsSnapshots)
    .values({
      domainId,
      recordsJson: JSON.stringify(records),
      recordHash,
      source: "dns",
      error: errors.length > 0 ? JSON.stringify(records.errors) : null,
      checkedAt: new Date(),
    })
    .returning();

  const findings = evaluateDnsFindings(records, previousRecords);
  const syncResult = await syncRiskFindings(domainId, findings);
  await refreshDomainRiskSummaries([domainId], { db });
  let notificationsSent = 0;
  if (options?.notify) {
    for (const finding of syncResult.createdRows) {
      if (finding.severity !== "HIGH") continue;
      const result = await notifySecurityFinding({ finding, domain });
      notificationsSent += result.successCount;
    }
  }

  return {
    snapshotId: snapshot.id,
    recordHash,
    findings,
    createdFindings: syncResult.createdRows,
    notificationsSent,
    errorCount: errors.length,
  };
};
