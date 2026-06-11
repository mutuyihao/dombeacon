import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../server/db/schema";
import {
  calculateRiskScore,
  getDomainRiskSummaries,
  highestOpenSeverity,
  refreshDomainRiskSummaries,
  summarizeDnsPosture,
} from "../server/utils/risk-summary";
import type { DnsSecurityRecords } from "../server/utils/security-scan";

const baseRecords: DnsSecurityRecords = {
  domain: "example.com",
  a: [],
  aaaa: [],
  cname: [],
  ns: [],
  mx: [],
  txt: [],
  caa: [],
  ds: [],
  spf: [],
  dmarc: [],
  bimi: [],
  errors: {},
};

describe("risk summary utilities", () => {
  it("scores only open findings and caps the score at 100", () => {
    expect(
      calculateRiskScore([
        { severity: "HIGH", status: "OPEN" },
        { severity: "HIGH", status: "OPEN" },
        { severity: "HIGH", status: "OPEN" },
        { severity: "LOW", status: "RESOLVED" },
      ]),
    ).toBe(100);
  });

  it("reports the highest open severity", () => {
    expect(
      highestOpenSeverity([
        { severity: "LOW", status: "OPEN" },
        { severity: "HIGH", status: "RESOLVED" },
        { severity: "MEDIUM", status: "OPEN" },
      ]),
    ).toBe("MEDIUM");
  });

  it("derives DNS posture from the latest snapshot records", () => {
    const posture = summarizeDnsPosture({
      ...baseRecords,
      caa: [{ issue: "letsencrypt.org" }],
      ds: [{ keyTag: 12345 }],
      spf: ["v=spf1 -all"],
      dmarc: ["v=DMARC1; p=reject"],
      bimi: ["v=BIMI1; l=https://example.com/bimi.svg"],
    });

    expect(posture).toEqual({
      dnssecStatus: "SIGNED",
      dmarcPolicy: "reject",
      spfConfigured: true,
      caaConfigured: true,
      bimiConfigured: true,
    });
  });

  it("populates and refreshes persisted domain risk summaries", async () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL UNIQUE,
        watch_kind TEXT NOT NULL DEFAULT 'WANTED',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        note TEXT,
        tags_json TEXT DEFAULT '[]',
        group_name TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE risk_findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain_id INTEGER NOT NULL,
        finding_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'LOW',
        status TEXT NOT NULL DEFAULT 'OPEN',
        evidence_json TEXT,
        first_seen_at INTEGER,
        last_seen_at INTEGER,
        snoozed_until INTEGER,
        resolved_at INTEGER
      );

      CREATE TABLE dns_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain_id INTEGER NOT NULL,
        records_json TEXT NOT NULL,
        record_hash TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'dns',
        error TEXT,
        checked_at INTEGER
      );

      CREATE TABLE domain_status_latest (
        domain_id INTEGER PRIMARY KEY,
        status TEXT NOT NULL,
        checked_at INTEGER,
        expires_at INTEGER,
        registrar TEXT,
        nameservers_json TEXT,
        source TEXT,
        raw_snapshot TEXT,
        rdap_summary_json TEXT,
        parse_reason TEXT,
        last_error TEXT,
        last_error_at INTEGER
      );

      CREATE TABLE domain_risk_summaries (
        domain_id INTEGER PRIMARY KEY,
        risk_score INTEGER NOT NULL DEFAULT 0,
        open_findings_count INTEGER NOT NULL DEFAULT 0,
        highest_severity TEXT,
        last_security_scan_at INTEGER,
        dnssec_status TEXT NOT NULL DEFAULT 'UNKNOWN',
        dmarc_policy TEXT NOT NULL DEFAULT 'unknown',
        registrar_lock_status TEXT NOT NULL DEFAULT 'UNKNOWN',
        spf_configured INTEGER NOT NULL DEFAULT 0,
        caa_configured INTEGER NOT NULL DEFAULT 0,
        bimi_configured INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER
      );
    `);
    const db = drizzle(sqlite, { schema });
    const checkedAt = new Date("2026-06-01T00:00:00.000Z");

    try {
      const [domain] = await db
        .insert(schema.domains)
        .values({
          domain: "example.com",
          watchKind: "OWNED",
          priority: "HIGH",
        })
        .returning();

      await db.insert(schema.riskFindings).values([
        {
          domainId: domain.id,
          findingType: "DMARC_MISSING",
          severity: "HIGH",
          status: "OPEN",
          firstSeenAt: checkedAt,
          lastSeenAt: checkedAt,
        },
        {
          domainId: domain.id,
          findingType: "BIMI_MISSING",
          severity: "LOW",
          status: "OPEN",
          firstSeenAt: checkedAt,
          lastSeenAt: checkedAt,
        },
      ]);
      await db.insert(schema.dnsSnapshots).values({
        domainId: domain.id,
        recordsJson: JSON.stringify({
          ...baseRecords,
          ds: [{ keyTag: 12345 }],
          spf: ["v=spf1 -all"],
          dmarc: ["v=DMARC1; p=reject"],
        }),
        recordHash: "hash-1",
        checkedAt,
      });
      await db.insert(schema.domainStatusLatest).values({
        domainId: domain.id,
        status: "REGISTERED",
        checkedAt,
        rdapSummaryJson: JSON.stringify({
          statuses: ["clientTransferProhibited"],
        }),
      });

      const initial = await getDomainRiskSummaries([domain.id], { db });
      expect(initial.get(domain.id)).toMatchObject({
        riskScore: 45,
        openFindingsCount: 2,
        highestSeverity: "HIGH",
        dnssecStatus: "SIGNED",
        dmarcPolicy: "reject",
        registrarLockStatus: "LOCKED",
        spfConfigured: true,
      });

      await db.delete(schema.riskFindings);
      await db.delete(schema.dnsSnapshots);
      await db.delete(schema.domainStatusLatest);

      const cached = await getDomainRiskSummaries([domain.id], {
        db,
        populateMissing: false,
      });
      expect(cached.get(domain.id)?.riskScore).toBe(45);

      await refreshDomainRiskSummaries([domain.id], { db });
      const refreshed = await getDomainRiskSummaries([domain.id], {
        db,
        populateMissing: false,
      });
      expect(refreshed.get(domain.id)).toMatchObject({
        riskScore: 0,
        openFindingsCount: 0,
        dnssecStatus: "UNKNOWN",
        registrarLockStatus: "UNKNOWN",
      });
    } finally {
      sqlite.close();
    }
  });
});
