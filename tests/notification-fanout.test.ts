import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../server/db/schema";
import { wasDedupeKeyRecentlySent } from "../server/utils/notification-fanout";
import {
  applyNotificationChannelPreset,
  getNotificationEventChannels,
  getRiskNotificationDeliverySummary,
  setNotificationEventChannelPresets,
} from "../server/utils/notification-preferences";

const createNotificationDb = () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE notification_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instant_enabled INTEGER DEFAULT 0,
      daily_enabled INTEGER DEFAULT 0,
      target_email TEXT,
      smtp_config_json TEXT
    );

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
      created_at INTEGER
    );

    CREATE TABLE app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER
    );

    CREATE TABLE webhook_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'POST',
      headers_json TEXT,
      enabled INTEGER DEFAULT 1,
      event_types TEXT,
      created_at INTEGER
    );

    CREATE TABLE serverchan_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      send_key TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      event_types TEXT,
      created_at INTEGER
    );

    CREATE TABLE push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER
    );
  `);

  return { sqlite, db: drizzle(sqlite, { schema }) };
};

describe("notification fanout utilities", () => {
  it("finds recent sent events by metadata dedupe key", async () => {
    const { sqlite, db } = createNotificationDb();

    await db.insert(schema.notificationEvents).values({
      eventType: "BRAND_WATCH_REGISTERED",
      channel: "WEBHOOK",
      status: "SENT",
      sentAt: new Date(),
      metadata: JSON.stringify({ dedupeKey: "brand-watch-candidate:42" }),
      createdAt: new Date(),
    });

    await db.insert(schema.notificationEvents).values({
      domainId: 7,
      eventType: "SECURITY_FINDING_HIGH",
      channel: "PUSH",
      status: "SENT",
      sentAt: new Date(),
      metadata: JSON.stringify({
        eventData: { dedupeKey: "security-finding:7" },
      }),
      createdAt: new Date(),
    });

    await expect(
      wasDedupeKeyRecentlySent({
        db,
        eventType: "BRAND_WATCH_REGISTERED",
        dedupeKey: "brand-watch-candidate:42",
      }),
    ).resolves.toBe(true);

    await expect(
      wasDedupeKeyRecentlySent({
        db,
        eventType: "SECURITY_FINDING_HIGH",
        dedupeKey: "security-finding:7",
        domainId: 7,
      }),
    ).resolves.toBe(true);

    await expect(
      wasDedupeKeyRecentlySent({
        db,
        eventType: "SECURITY_FINDING_HIGH",
        dedupeKey: "security-finding:7",
        domainId: 8,
      }),
    ).resolves.toBe(false);

    sqlite.close();
  });

  it("persists and applies risk event channel presets", async () => {
    const { sqlite, db } = createNotificationDb();

    await expect(
      getNotificationEventChannels("STATUS_CHANGE", { db }),
    ).resolves.toEqual({
      email: true,
      webhook: true,
      serverchan: true,
      push: true,
    });

    const saved = await setNotificationEventChannelPresets(
      {
        SECURITY_FINDING_HIGH: { email: false, push: true },
        BRAND_WATCH_REGISTERED: { webhook: false },
      },
      { db },
    );

    expect(saved.SECURITY_FINDING_HIGH).toEqual({
      email: false,
      webhook: true,
      serverchan: true,
      push: true,
    });
    await expect(
      getNotificationEventChannels("BRAND_WATCH_REGISTERED", { db }),
    ).resolves.toEqual({
      email: true,
      webhook: false,
      serverchan: true,
      push: true,
    });
    expect(
      applyNotificationChannelPreset(
        { email: true, webhook: false },
        saved.SECURITY_FINDING_HIGH,
      ),
    ).toEqual({
      email: false,
      webhook: false,
      serverchan: true,
      push: true,
    });

    sqlite.close();
  });

  it("summarizes risk notification delivery counts and dedupe keys", async () => {
    const { sqlite, db } = createNotificationDb();
    const now = new Date("2026-01-02T00:00:00.000Z");
    const old = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    await db.insert(schema.notificationEvents).values([
      {
        eventType: "SECURITY_FINDING_HIGH",
        channel: "EMAIL",
        status: "SENT",
        sentAt: now,
        metadata: JSON.stringify({ dedupeKey: "security-finding:1" }),
        createdAt: now,
      },
      {
        eventType: "SECURITY_FINDING_HIGH",
        channel: "PUSH",
        status: "FAILED",
        failedAt: now,
        errorMessage: "push failed",
        createdAt: now,
      },
      {
        eventType: "BRAND_WATCH_REGISTERED",
        channel: "WEBHOOK",
        status: "SENT",
        sentAt: old,
        metadata: JSON.stringify({ dedupeKey: "brand-watch-candidate:old" }),
        createdAt: old,
      },
      {
        eventType: "BRAND_WATCH_REGISTERED",
        channel: "SERVERCHAN",
        status: "SENT",
        sentAt: now,
        metadata: JSON.stringify({
          eventData: { dedupeKey: "brand-watch-candidate:2" },
        }),
        createdAt: now,
      },
    ]);

    const summary = await getRiskNotificationDeliverySummary({
      db,
      now,
      dedupeWindowHours: 24,
    });

    expect(summary.events.SECURITY_FINDING_HIGH.sent).toBe(1);
    expect(summary.events.SECURITY_FINDING_HIGH.failed).toBe(1);
    expect(
      summary.events.SECURITY_FINDING_HIGH.channels.EMAIL.sent,
    ).toBe(1);
    expect(
      summary.events.SECURITY_FINDING_HIGH.channels.PUSH.failed,
    ).toBe(1);
    expect(
      summary.events.SECURITY_FINDING_HIGH.dedupeKeysLastWindow,
    ).toBe(1);
    expect(
      summary.events.BRAND_WATCH_REGISTERED.dedupeKeysLastWindow,
    ).toBe(1);
    expect(summary.events.BRAND_WATCH_REGISTERED.lastDedupeKey).toBe(
      "brand-watch-candidate:2",
    );

    sqlite.close();
  });

  it("reports risk channel diagnostics for presets and destinations", async () => {
    const { sqlite, db } = createNotificationDb();
    const previousVapid = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT,
    };

    try {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      delete process.env.VAPID_SUBJECT;

      let summary = await getRiskNotificationDeliverySummary({ db });

      expect(
        summary.events.SECURITY_FINDING_HIGH.channels.EMAIL.diagnostic,
      ).toMatchObject({
        presetEnabled: true,
        configured: false,
        destinationCount: 0,
        severity: "warning",
      });
      expect(
        summary.events.SECURITY_FINDING_HIGH.channels.WEBHOOK.diagnostic
          .message,
      ).toContain("No enabled webhook");
      expect(
        summary.events.SECURITY_FINDING_HIGH.channels.PUSH.diagnostic.message,
      ).toBe("VAPID keys are not configured.");

      await setNotificationEventChannelPresets(
        {
          SECURITY_FINDING_HIGH: { webhook: false },
        },
        { db },
      );

      summary = await getRiskNotificationDeliverySummary({ db });
      expect(
        summary.events.SECURITY_FINDING_HIGH.channels.WEBHOOK.diagnostic,
      ).toMatchObject({
        presetEnabled: false,
        configured: false,
        severity: "disabled",
        message: "Preset disabled for this risk event.",
      });

      await db.insert(schema.notificationRules).values({
        targetEmail: "ops@example.com",
        smtpConfigJson: JSON.stringify({ host: "smtp.example.com" }),
      });
      await db.insert(schema.webhookConfigs).values({
        name: "Risk webhook",
        url: "https://hooks.example.com/dom-beacon",
        method: "POST",
        enabled: true,
        eventTypes: JSON.stringify(["security_finding_high"]),
        createdAt: new Date(),
      });
      await db.insert(schema.serverchanConfigs).values({
        name: "Risk ServerChan",
        sendKey: "secret",
        enabled: true,
        eventTypes: null,
        createdAt: new Date(),
      });
      await db.insert(schema.pushSubscriptions).values({
        endpoint: "https://push.example.com/subscription",
        p256dh: "p256dh",
        auth: "auth",
        enabled: true,
        createdAt: new Date(),
      });

      process.env.VAPID_PUBLIC_KEY = "public";
      process.env.VAPID_PRIVATE_KEY = "private";
      process.env.VAPID_SUBJECT = "mailto:ops@example.com";

      summary = await getRiskNotificationDeliverySummary({ db });
      expect(
        summary.events.SECURITY_FINDING_HIGH.channels.EMAIL.diagnostic,
      ).toMatchObject({
        configured: true,
        destinationCount: 1,
        severity: "ok",
      });
      expect(
        summary.events.SECURITY_FINDING_HIGH.channels.WEBHOOK.diagnostic,
      ).toMatchObject({
        presetEnabled: false,
        configured: true,
        destinationCount: 1,
        severity: "disabled",
      });
      expect(
        summary.events.SECURITY_FINDING_HIGH.channels.SERVERCHAN.diagnostic,
      ).toMatchObject({
        configured: true,
        destinationCount: 1,
        severity: "ok",
      });
      expect(
        summary.events.SECURITY_FINDING_HIGH.channels.PUSH.diagnostic,
      ).toMatchObject({
        configured: true,
        destinationCount: 1,
        severity: "ok",
      });
    } finally {
      if (previousVapid.publicKey === undefined) {
        delete process.env.VAPID_PUBLIC_KEY;
      } else {
        process.env.VAPID_PUBLIC_KEY = previousVapid.publicKey;
      }
      if (previousVapid.privateKey === undefined) {
        delete process.env.VAPID_PRIVATE_KEY;
      } else {
        process.env.VAPID_PRIVATE_KEY = previousVapid.privateKey;
      }
      if (previousVapid.subject === undefined) {
        delete process.env.VAPID_SUBJECT;
      } else {
        process.env.VAPID_SUBJECT = previousVapid.subject;
      }
      sqlite.close();
    }
  });
});
