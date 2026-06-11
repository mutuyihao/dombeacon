import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../server/db/schema";
import { getSecurityDashboardSummary } from "../server/utils/security-dashboard";

describe("security dashboard summary", () => {
  it("aggregates owned-domain findings", async () => {
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
            totalRiskSignals: 5,
            highRiskSignals: 2,
            riskPressureScore: 25,
          },
        }),
      },
      {
        taskName: "daily-summary",
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
            totalRiskSignals: 2,
            highRiskSignals: 1,
            riskPressureScore: 12,
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
    });
    expect(summary.riskMetrics).toMatchObject({
      totalRiskSignals: 2,
      highRiskSignals: 1,
      riskPressureScore: 12,
    });
    expect(summary.riskMetricHistory).toHaveLength(2);
    expect(summary.riskMetricHistory.map((row) => row.taskName)).toEqual([
      "hourly-scan",
      "daily-summary",
    ]);
    expect(summary.riskMetricHistory[1].metrics).toMatchObject({
      riskPressureScore: 12,
      totalRiskSignals: 2,
    });
    expect(summary.trends).toMatchObject({
      openFindings: 1,
      registrarLockGaps: 1,
      dnsDriftFindings: 0,
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

    sqlite.close();
  });
});
