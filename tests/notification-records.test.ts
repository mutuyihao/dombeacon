import { and } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import * as schema from "../server/db/schema";
import {
  buildNotificationEventConditions,
  getNotificationArchiveMode,
  parseNotificationRecordIds,
} from "../server/utils/notification-records";

const createNotificationDb = () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE notification_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain_id INTEGER,
      action_id INTEGER,
      event_type TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      sent_at INTEGER,
      failed_at INTEGER,
      error_message TEXT,
      metadata TEXT,
      retry_of INTEGER,
      archived_at INTEGER,
      created_at INTEGER
    );
  `);

  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
  };
};

describe("notification record filters", () => {
  let sqlite: Database.Database | null = null;

  afterEach(() => {
    sqlite?.close();
    sqlite = null;
  });

  it("defaults mutation filters to active failed records", async () => {
    const created = createNotificationDb();
    sqlite = created.sqlite;
    const { db } = created;
    const now = new Date("2026-01-02T00:00:00.000Z");

    await db.insert(schema.notificationEvents).values([
      {
        eventType: "SECURITY_FINDING_HIGH",
        channel: "WEBHOOK",
        status: "FAILED",
        failedAt: now,
        createdAt: now,
      },
      {
        eventType: "SECURITY_FINDING_HIGH",
        channel: "WEBHOOK",
        status: "SENT",
        sentAt: now,
        createdAt: now,
      },
      {
        eventType: "SECURITY_FINDING_HIGH",
        channel: "WEBHOOK",
        status: "FAILED",
        failedAt: now,
        archivedAt: now,
        createdAt: now,
      },
    ]);

    const conditions = buildNotificationEventConditions(
      {},
      { archivedMode: "active", defaultStatus: "FAILED" },
    );
    const rows = await db
      .select()
      .from(schema.notificationEvents)
      .where(and(...conditions))
      .all();

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("FAILED");
    expect(rows[0].archivedAt).toBeNull();
  });

  it("normalizes status, channel, and event type filters", async () => {
    const created = createNotificationDb();
    sqlite = created.sqlite;
    const { db } = created;
    const now = new Date("2026-01-02T00:00:00.000Z");

    await db.insert(schema.notificationEvents).values([
      {
        eventType: "SECURITY_FINDING_HIGH",
        channel: "WEBHOOK",
        status: "FAILED",
        failedAt: now,
        createdAt: now,
      },
      {
        eventType: "STATUS_CHANGE",
        channel: "EMAIL",
        status: "FAILED",
        failedAt: now,
        createdAt: now,
      },
    ]);

    const conditions = buildNotificationEventConditions(
      {
        status: "failed",
        channel: "webhook",
        eventType: "security_finding_high",
      },
      { archivedMode: "active" },
    );
    const rows = await db
      .select()
      .from(schema.notificationEvents)
      .where(and(...conditions))
      .all();

    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe("SECURITY_FINDING_HIGH");
    expect(rows[0].channel).toBe("WEBHOOK");
  });

  it("parses archive modes and de-duplicates positive ids", () => {
    expect(getNotificationArchiveMode("archived")).toBe("archived");
    expect(getNotificationArchiveMode("all")).toBe("all");
    expect(getNotificationArchiveMode("false", "archived")).toBe("active");
    expect(parseNotificationRecordIds([1, "1", 2, 0, -1, "x"])).toEqual([
      1,
      2,
    ]);
  });

  it("rejects invalid status, channel, domain id, and date ranges", () => {
    expect(() =>
      buildNotificationEventConditions({ status: "missing" }),
    ).toThrow("Invalid notification status");
    expect(() => buildNotificationEventConditions({ status: 0 })).toThrow(
      "Invalid notification status",
    );
    expect(() =>
      buildNotificationEventConditions({ channel: "sms" }),
    ).toThrow("Invalid notification channel");
    expect(() =>
      buildNotificationEventConditions({ domainId: "-1" }),
    ).toThrow("Invalid domainId");
    expect(() =>
      buildNotificationEventConditions({ domainId: 0 }),
    ).toThrow("Invalid domainId");
    expect(() =>
      buildNotificationEventConditions({
        from: "2026-01-03T00:00:00.000Z",
        to: "2026-01-02T00:00:00.000Z",
      }),
    ).toThrow("Invalid date range");
  });
});
