import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "../server/db/schema";
import {
  bulkUpdateRiskFindingStatus,
  normalizeFindingIds,
  validateRiskFindingStatusUpdate,
} from "../server/utils/security-findings";

const createRiskFindingDb = () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
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
  `);

  return { sqlite, db: drizzle(sqlite, { schema }) };
};

describe("security finding status utilities", () => {
  it("validates status transitions and bulk id input", () => {
    expect(validateRiskFindingStatusUpdate({ status: "CLOSED" })).toEqual({
      error: "Invalid status. Must be OPEN, SNOOZED, DISMISSED, or RESOLVED",
    });
    expect(validateRiskFindingStatusUpdate({ status: "SNOOZED" })).toEqual({
      error: "snoozedUntil is required when status is SNOOZED",
    });
    expect(
      validateRiskFindingStatusUpdate({
        status: "SNOOZED",
        snoozedUntil: "not-a-date",
      }),
    ).toEqual({ error: "Invalid snoozedUntil" });
    expect(normalizeFindingIds([1, "2", 2, 0, -1, "bad"])).toEqual({
      ids: [1, 2],
      error: null,
    });
  });

  it("bulk-updates only requested findings using the normal lifecycle fields", async () => {
    const { sqlite, db } = createRiskFindingDb();
    const now = new Date("2026-05-08T00:00:00.000Z");
    const snoozedUntil = new Date("2026-05-15T00:00:00.000Z");

    await db.insert(schema.riskFindings).values([
      {
        domainId: 1,
        findingType: "DMARC_MISSING",
        severity: "HIGH",
        status: "OPEN",
      },
      {
        domainId: 1,
        findingType: "CAA_MISSING",
        severity: "MEDIUM",
        status: "OPEN",
      },
      {
        domainId: 2,
        findingType: "DNSSEC_UNSIGNED",
        severity: "LOW",
        status: "OPEN",
      },
    ]);

    const snoozed = await bulkUpdateRiskFindingStatus({
      db,
      ids: [1, 2, 404],
      status: "SNOOZED",
      snoozedUntil,
      now,
    });

    expect(snoozed.map((finding) => finding.id).sort()).toEqual([1, 2]);
    const row1 = await db
      .select()
      .from(schema.riskFindings)
      .where(eq(schema.riskFindings.id, 1))
      .get();
    const row3 = await db
      .select()
      .from(schema.riskFindings)
      .where(eq(schema.riskFindings.id, 3))
      .get();

    expect(row1?.status).toBe("SNOOZED");
    expect(row1?.snoozedUntil?.toISOString()).toBe(snoozedUntil.toISOString());
    expect(row1?.resolvedAt).toBeNull();
    expect(row3?.status).toBe("OPEN");

    await bulkUpdateRiskFindingStatus({
      db,
      ids: [1],
      status: "RESOLVED",
      snoozedUntil: null,
      now,
    });
    const resolved = await db
      .select()
      .from(schema.riskFindings)
      .where(eq(schema.riskFindings.id, 1))
      .get();

    expect(resolved?.status).toBe("RESOLVED");
    expect(resolved?.snoozedUntil).toBeNull();
    expect(resolved?.resolvedAt?.toISOString()).toBe(now.toISOString());

    sqlite.close();
  });
});
