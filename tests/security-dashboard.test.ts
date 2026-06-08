import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../server/db/schema";
import { getSecurityDashboardSummary } from "../server/utils/security-dashboard";

describe("security dashboard summary", () => {
  it("aggregates owned-domain findings and active Brand Watch registrations", async () => {
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

      CREATE TABLE brand_watch_terms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL,
        normalized_term TEXT NOT NULL,
        term_type TEXT NOT NULL DEFAULT 'BRAND',
        match_strategy TEXT NOT NULL DEFAULT 'STANDARD',
        tlds_json TEXT NOT NULL DEFAULT '["com","net","org"]',
        severity TEXT NOT NULL DEFAULT 'MEDIUM',
        enabled INTEGER DEFAULT 1,
        scan_frequency_hours INTEGER DEFAULT 24,
        last_scanned_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE brand_watch_candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term_id INTEGER NOT NULL,
        domain TEXT NOT NULL,
        label TEXT NOT NULL,
        tld TEXT NOT NULL,
        mutation_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'UNKNOWN',
        severity TEXT NOT NULL DEFAULT 'MEDIUM',
        source TEXT NOT NULL DEFAULT 'rdap',
        evidence_json TEXT,
        review_status TEXT NOT NULL DEFAULT 'OPEN',
        review_note TEXT,
        reviewed_at INTEGER,
        reviewed_by TEXT,
        first_seen_at INTEGER,
        last_seen_at INTEGER,
        checked_at INTEGER,
        last_error TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE task_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_name TEXT,
        started_at INTEGER,
        finished_at INTEGER,
        result_json TEXT
      );
    `);
    const db = drizzle(sqlite, { schema });
    const now = new Date("2026-05-08T00:00:00.000Z");
    const recent = new Date("2026-05-07T00:00:00.000Z");
    const older = new Date("2026-04-01T00:00:00.000Z");

    const [domain] = await db
      .insert(schema.domains)
      .values({
        domain: "example.com",
        watchKind: "OWNED",
        priority: "HIGH",
        isActive: true,
      })
      .returning();
    await db.insert(schema.domains).values({
      domain: "inactive.example",
      watchKind: "OWNED",
      isActive: false,
    });
    const [wantedDomain] = await db
      .insert(schema.domains)
      .values({
        domain: "wanted.example",
        watchKind: "WANTED",
        isActive: true,
      })
      .returning();

    await db.insert(schema.riskFindings).values([
      {
        domainId: domain.id,
        findingType: "REGISTRAR_LOCK_MISSING",
        severity: "HIGH",
        status: "OPEN",
        evidenceJson: JSON.stringify({ lockStatus: "UNLOCKED" }),
        firstSeenAt: recent,
        lastSeenAt: recent,
      },
      {
        domainId: domain.id,
        findingType: "NAMESERVER_DRIFT",
        severity: "MEDIUM",
        status: "OPEN",
        evidenceJson: JSON.stringify({
          previous: ["ns1.example.com"],
          current: ["ns2.example.com"],
        }),
        firstSeenAt: older,
        lastSeenAt: recent,
      },
      {
        domainId: domain.id,
        findingType: "CAA_MISSING",
        severity: "MEDIUM",
        status: "RESOLVED",
        firstSeenAt: older,
        lastSeenAt: older,
      },
      {
        domainId: wantedDomain.id,
        findingType: "DMARC_MISSING",
        severity: "HIGH",
        status: "OPEN",
        firstSeenAt: recent,
        lastSeenAt: recent,
      },
    ]);

    const [term] = await db
      .insert(schema.brandWatchTerms)
      .values({
        term: "Example",
        normalizedTerm: "example",
        tldsJson: JSON.stringify(["com"]),
      })
      .returning();

    await db.insert(schema.brandWatchCandidates).values([
      {
        termId: term.id,
        domain: "example-login.com",
        label: "example-login",
        tld: "com",
        mutationType: "suffix",
        status: "REGISTERED",
        severity: "HIGH",
        source: "ct",
        reviewStatus: "OPEN",
        firstSeenAt: recent,
        lastSeenAt: recent,
      },
      {
        termId: term.id,
        domain: "example-secure.com",
        label: "example-secure",
        tld: "com",
        mutationType: "suffix",
        status: "REGISTERED",
        severity: "HIGH",
        source: "rdap",
        reviewStatus: "DISMISSED",
        firstSeenAt: recent,
        lastSeenAt: recent,
      },
      {
        termId: term.id,
        domain: "example-free.com",
        label: "example-free",
        tld: "com",
        mutationType: "suffix",
        status: "AVAILABLE",
        severity: "LOW",
        source: "rdap",
        reviewStatus: "OPEN",
        firstSeenAt: recent,
        lastSeenAt: recent,
      },
    ]);

    await db.insert(schema.taskRuns).values([
      {
        taskName: "hourly-scan",
        startedAt: older,
        finishedAt: older,
        resultJson: JSON.stringify({
          riskMetrics: {
            generatedAt: older.toISOString(),
            ownedDomains: 1,
            openFindings: 5,
            highOpenFindings: 2,
            registrarLockGaps: 2,
            dnsDriftFindings: 1,
            registeredLookalikes: 0,
            highRegisteredLookalikes: 0,
            totalRiskSignals: 5,
            highRiskSignals: 2,
            riskPressureScore: 25,
          },
        }),
      },
      {
        taskName: "brand-watch",
        startedAt: recent,
        finishedAt: recent,
        resultJson: JSON.stringify({
          riskMetrics: {
            generatedAt: recent.toISOString(),
            ownedDomains: 1,
            openFindings: 2,
            highOpenFindings: 1,
            registrarLockGaps: 1,
            dnsDriftFindings: 1,
            registeredLookalikes: 1,
            highRegisteredLookalikes: 1,
            ctRegisteredLookalikes: 1,
            rdapRegisteredLookalikes: 0,
            totalRiskSignals: 3,
            highRiskSignals: 2,
            riskPressureScore: 17,
          },
        }),
      },
    ]);

    const summary = await getSecurityDashboardSummary({
      db,
      now,
      windowDays: 7,
      limit: 5,
    });

    expect(summary).toMatchObject({
      ownedDomains: 1,
      openFindings: 2,
      highOpenFindings: 1,
      registrarLockGaps: 1,
      dnsDriftFindings: 1,
      registeredLookalikes: 1,
      highRegisteredLookalikes: 1,
      ctRegisteredLookalikes: 1,
      rdapRegisteredLookalikes: 0,
    });
    expect(summary.riskMetrics).toMatchObject({
      totalRiskSignals: 3,
      highRiskSignals: 2,
      riskPressureScore: 17,
    });
    expect(summary.riskMetricHistory).toHaveLength(2);
    expect(summary.riskMetricHistory.map((row) => row.taskName)).toEqual([
      "hourly-scan",
      "brand-watch",
    ]);
    expect(summary.riskMetricHistory[1].metrics).toMatchObject({
      riskPressureScore: 17,
      totalRiskSignals: 3,
    });
    expect(summary.trends).toMatchObject({
      openFindings: 1,
      registrarLockGaps: 1,
      dnsDriftFindings: 0,
      registeredLookalikes: 1,
    });
    expect(summary.findingTypeCounts).toMatchObject({
      REGISTRAR_LOCK_MISSING: 1,
      NAMESERVER_DRIFT: 1,
    });
    expect(summary.topRiskDomains[0]).toMatchObject({
      domainId: domain.id,
      domain: "example.com",
      riskScore: 60,
      openFindingsCount: 2,
      highestSeverity: "HIGH",
    });
    expect(summary.recentBrandRisks[0]).toMatchObject({
      domain: "example-login.com",
      term: "Example",
      source: "ct",
    });

    sqlite.close();
  });
});
