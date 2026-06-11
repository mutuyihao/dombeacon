import { describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../server/db/schema";

describe("getActionsWithDomains()", () => {
  it("orders by priority weight (HIGH > MEDIUM > LOW) then triggeredAt desc", async () => {
    const sqlite = new Database(":memory:");
    sqlite.exec("PRAGMA foreign_keys = ON;");

    // Minimal tables matching the columns referenced by the Drizzle schema.
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

      CREATE TABLE actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
        action_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        priority TEXT NOT NULL,
        triggered_at INTEGER,
        snoozed_until INTEGER,
        resolved_at INTEGER,
        archived_at INTEGER,
        metadata TEXT
      );
    `);

    const db = drizzle(sqlite, { schema });

    const [d] = await db
      .insert(schema.domains)
      .values({
        domain: "a.com",
        watchKind: "WANTED",
        priority: "MEDIUM",
        isActive: true,
      })
      .returning({ id: schema.domains.id });

    await db.insert(schema.actions).values([
      {
        domainId: d.id,
        actionType: "SCAN_FAILED",
        status: "OPEN",
        priority: "HIGH",
        triggeredAt: new Date("2025-01-01T00:00:00Z"),
        metadata: null,
      },
      {
        domainId: d.id,
        actionType: "SCAN_FAILED",
        status: "OPEN",
        priority: "HIGH",
        triggeredAt: new Date("2025-01-02T00:00:00Z"),
        metadata: null,
      },
      {
        domainId: d.id,
        actionType: "SCAN_FAILED",
        status: "OPEN",
        priority: "MEDIUM",
        triggeredAt: new Date("2025-01-03T00:00:00Z"),
        metadata: null,
      },
      {
        domainId: d.id,
        actionType: "SCAN_FAILED",
        status: "OPEN",
        priority: "LOW",
        triggeredAt: new Date("2025-01-04T00:00:00Z"),
        metadata: null,
      },
    ]);

    vi.resetModules();
    vi.doMock("../server/utils/db", () => {
      return {
        useDb: () => db,
        getDbPath: () => null,
      };
    });

    const { getActionsWithDomains } = await import("../server/utils/actions");

    const rows = await getActionsWithDomains();
    const ordered = rows.map((r) => ({
      priority: r.action.priority,
      triggeredAt: r.action.triggeredAt,
    }));

    expect(ordered[0].priority).toBe("HIGH");
    expect(ordered[1].priority).toBe("HIGH");
    expect(ordered[2].priority).toBe("MEDIUM");
    expect(ordered[3].priority).toBe("LOW");

    // Within the same priority, newest first.
    expect(new Date(ordered[0].triggeredAt).getTime()).toBeGreaterThan(
      new Date(ordered[1].triggeredAt).getTime(),
    );

    sqlite.close();
  });
});
