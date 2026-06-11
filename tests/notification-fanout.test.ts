import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../server/db/schema";
import { wasDedupeKeyRecentlySent } from "../server/utils/notification-fanout";
import {
  applyNotificationChannelPreset,
  getEffectiveNotificationChannels,
  getNotificationChannelSettings,
  getNotificationEventChannels,
  getRiskNotificationDeliverySummary,
  setNotificationChannelSettings,
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
      archived_at INTEGER,
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
      options_json TEXT,
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
      eventType: "SECURITY_FINDING_HIGH",
      channel: "WEBHOOK",
      status: "SENT",
      sentAt: new Date(),
      metadata: JSON.stringify({ dedupeKey: "security-finding:42" }),
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
        eventType: "SECURITY_FINDING_HIGH",
        dedupeKey: "security-finding:42",
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
      getNotificationEventChannels("SECURITY_FINDING_HIGH", { db }),
    ).resolves.toEqual({
      email: false,
      webhook: true,
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

  it("requires channel opt-in and configuration before fanout is effective", async () => {
    const { sqlite, db } = createNotificationDb();

    await expect(getNotificationChannelSettings({ db })).resolves.toEqual({
      email: false,
      webhook: false,
      serverchan: false,
      push: false,
    });

    await expect(
      getEffectiveNotificationChannels("WANTED_AVAILABLE", undefined, { db }),
    ).resolves.toMatchObject({
      channels: {
        email: false,
        webhook: false,
        serverchan: false,
        push: false,
      },
    });

    await setNotificationChannelSettings(
      { email: true, webhook: true },
      { db },
    );
    await db.insert(schema.notificationRules).values({
      instantEnabled: true,
      targetEmail: "ops@example.com",
      smtpConfigJson: JSON.stringify({
        host: "smtp.example.com",
        from: "noreply@example.com",
      }),
    });
    await db.insert(schema.webhookConfigs).values({
      name: "Availability webhook",
      url: "https://hooks.example.com/dom-beacon",
      method: "POST",
      enabled: true,
      eventTypes: null,
      createdAt: new Date(),
    });

    await expect(
      getEffectiveNotificationChannels("WANTED_AVAILABLE", undefined, { db }),
    ).resolves.toMatchObject({
      channels: {
        email: true,
        webhook: true,
        serverchan: false,
        push: false,
      },
    });

    sqlite.close();
  });

  it("summarizes risk notification delivery counts and dedupe keys", async () => {
    const { sqlite, db } = createNotificationDb();
    const now = new Date("2026-01-02T00:00:00.000Z");

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
        eventType: "SECURITY_FINDING_HIGH",
        channel: "SERVERCHAN",
        status: "SENT",
        sentAt: now,
        metadata: JSON.stringify({
          eventData: { dedupeKey: "security-finding:2" },
        }),
        createdAt: now,
      },
    ]);

    const summary = await getRiskNotificationDeliverySummary({
      db,
      now,
      dedupeWindowHours: 24,
    });

    expect(summary.events.SECURITY_FINDING_HIGH.sent).toBe(2);
    expect(summary.events.SECURITY_FINDING_HIGH.failed).toBe(1);
    expect(
      summary.events.SECURITY_FINDING_HIGH.channels.EMAIL.sent,
    ).toBe(1);
    expect(
      summary.events.SECURITY_FINDING_HIGH.channels.PUSH.failed,
    ).toBe(1);
    expect(
      summary.events.SECURITY_FINDING_HIGH.dedupeKeysLastWindow,
    ).toBe(2);
    expect(summary.events.SECURITY_FINDING_HIGH.lastDedupeKey).toBe(
      "security-finding:2",
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
        severity: "disabled",
      });
      expect(
        summary.events.SECURITY_FINDING_HIGH.channels.WEBHOOK.diagnostic
          .message,
      ).toContain("disabled");
      expect(
        summary.events.SECURITY_FINDING_HIGH.channels.PUSH.diagnostic.message,
      ).toContain("disabled");

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

      await setNotificationChannelSettings(
        { email: true, webhook: true, serverchan: true, push: true },
        { db },
      );
      await db.insert(schema.notificationRules).values({
        instantEnabled: true,
        targetEmail: "ops@example.com",
        smtpConfigJson: JSON.stringify({
          host: "smtp.example.com",
          from: "noreply@example.com",
        }),
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
