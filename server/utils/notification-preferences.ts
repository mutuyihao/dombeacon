import { eq } from "drizzle-orm";
import {
  appSettings,
  notificationEvents,
  notificationRules,
  pushSubscriptions,
  serverchanConfigs,
  webhookConfigs,
} from "../db/schema";

const EVENT_CHANNEL_PRESETS_KEY = "notifications.eventChannelPresets";
const DEDUPE_WINDOW_HOURS = 24;

export const RISK_NOTIFICATION_EVENT_TYPES = [
  "SECURITY_FINDING_HIGH",
  "BRAND_WATCH_REGISTERED",
] as const;

export const NOTIFICATION_CHANNEL_KEYS = [
  "email",
  "webhook",
  "serverchan",
  "push",
] as const;

const CHANNEL_NAMES = ["EMAIL", "WEBHOOK", "SERVERCHAN", "PUSH"] as const;

type ChannelKey = (typeof NOTIFICATION_CHANNEL_KEYS)[number];
type NotificationChannelPreset = Record<ChannelKey, boolean>;
type ChannelName = (typeof CHANNEL_NAMES)[number];

const CHANNEL_KEY_BY_NAME: Record<ChannelName, ChannelKey> = {
  EMAIL: "email",
  WEBHOOK: "webhook",
  SERVERCHAN: "serverchan",
  PUSH: "push",
};

const allChannelsEnabled = (): NotificationChannelPreset => ({
  email: true,
  webhook: true,
  serverchan: true,
  push: true,
});

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
};

const dateMs = (value: unknown) => {
  if (!value) return 0;
  const time = (value instanceof Date ? value : new Date(value as any)).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const toIso = (value: unknown) => {
  const time = dateMs(value);
  return time ? new Date(time).toISOString() : null;
};

const hasText = (value: unknown) => Boolean(String(value || "").trim());

const formatMissing = (items: string[]) =>
  items.length === 1
    ? `Missing ${items[0]}.`
    : `Missing ${items.slice(0, -1).join(", ")} and ${
        items[items.length - 1]
      }.`;

const matchesEventTypes = (
  value: string | null | undefined,
  eventType: string,
  options?: { wildcard?: boolean },
) => {
  if (!value) return true;
  try {
    const types = JSON.parse(value);
    if (!Array.isArray(types)) return true;
    const normalizedTypes = types.map((type) =>
      String(type || "").toUpperCase(),
    );
    return (
      normalizedTypes.includes(eventType) ||
      Boolean(options?.wildcard && normalizedTypes.includes("*"))
    );
  } catch {
    return true;
  }
};

export const normalizeNotificationEventChannelPresets = (value: unknown) => {
  const input = value && typeof value === "object" ? (value as any) : {};
  return RISK_NOTIFICATION_EVENT_TYPES.reduce<
    Record<string, NotificationChannelPreset>
  >((acc, eventType) => {
    const eventInput = input[eventType] || {};
    acc[eventType] = NOTIFICATION_CHANNEL_KEYS.reduce<NotificationChannelPreset>(
      (channels, channel) => {
        channels[channel] =
          typeof eventInput[channel] === "boolean"
            ? eventInput[channel]
            : true;
        return channels;
      },
      allChannelsEnabled(),
    );
    return acc;
  }, {});
};

export const getNotificationEventChannelPresets = async (options?: {
  db?: ReturnType<typeof useDb>;
}) => {
  const db = options?.db ?? useDb();
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, EVENT_CHANNEL_PRESETS_KEY))
    .limit(1)
    .get();

  return normalizeNotificationEventChannelPresets(
    parseJson(row?.value, {}),
  );
};

export const setNotificationEventChannelPresets = async (
  value: unknown,
  options?: { db?: ReturnType<typeof useDb> },
) => {
  const db = options?.db ?? useDb();
  const presets = normalizeNotificationEventChannelPresets(value);
  const existing = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, EVENT_CHANNEL_PRESETS_KEY))
    .limit(1)
    .get();

  const values = {
    value: JSON.stringify(presets),
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(appSettings)
      .set(values)
      .where(eq(appSettings.key, EVENT_CHANNEL_PRESETS_KEY));
  } else {
    await db.insert(appSettings).values({
      key: EVENT_CHANNEL_PRESETS_KEY,
      ...values,
    });
  }

  return presets;
};

export const getNotificationEventChannels = async (
  eventType: string,
  options?: { db?: ReturnType<typeof useDb> },
) => {
  if (!RISK_NOTIFICATION_EVENT_TYPES.includes(eventType as any)) {
    return allChannelsEnabled();
  }

  const presets = await getNotificationEventChannelPresets(options);
  return presets[eventType] || allChannelsEnabled();
};

export const applyNotificationChannelPreset = (
  requested: Partial<NotificationChannelPreset> | undefined,
  preset: NotificationChannelPreset,
) =>
  NOTIFICATION_CHANNEL_KEYS.reduce<NotificationChannelPreset>(
    (acc, channel) => {
      const requestedEnabled = requested?.[channel] ?? true;
      acc[channel] = Boolean(requestedEnabled && preset[channel]);
      return acc;
    },
    allChannelsEnabled(),
  );

const getRiskNotificationChannelDiagnostics = async (options?: {
  db?: ReturnType<typeof useDb>;
}) => {
  const db = options?.db ?? useDb();
  const [presets, rule, webhooks, serverchans, pushSubs] = await Promise.all([
    getNotificationEventChannelPresets({ db }),
    db.select().from(notificationRules).limit(1).get(),
    db.select().from(webhookConfigs).all(),
    db.select().from(serverchanConfigs).all(),
    db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.enabled, true))
      .all(),
  ]);

  const smtpConfig = parseJson<Record<string, any>>(rule?.smtpConfigJson, {});
  const emailMissing = [
    !hasText(rule?.targetEmail) ? "target email" : "",
    !hasText(smtpConfig.host) ? "SMTP host" : "",
  ].filter(Boolean);
  const emailConfigured = emailMissing.length === 0;
  const vapidConfigured = Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );

  return RISK_NOTIFICATION_EVENT_TYPES.reduce<Record<string, any>>(
    (events, eventType) => {
      const matchingWebhooks = webhooks.filter(
        (config) =>
          Boolean(config.enabled) &&
          matchesEventTypes(config.eventTypes, eventType, { wildcard: true }),
      );
      const matchingServerchans = serverchans.filter(
        (config) =>
          Boolean(config.enabled) &&
          matchesEventTypes(config.eventTypes, eventType),
      );

      const base: Record<ChannelName, any> = {
        EMAIL: {
          configured: emailConfigured,
          destinationCount: emailConfigured ? 1 : 0,
          message: emailConfigured
            ? "SMTP target is configured."
            : formatMissing(emailMissing),
        },
        WEBHOOK: {
          configured: matchingWebhooks.length > 0,
          destinationCount: matchingWebhooks.length,
          message:
            matchingWebhooks.length > 0
              ? `${matchingWebhooks.length} matching webhook destination(s).`
              : `No enabled webhook matches ${eventType}.`,
        },
        SERVERCHAN: {
          configured: matchingServerchans.length > 0,
          destinationCount: matchingServerchans.length,
          message:
            matchingServerchans.length > 0
              ? `${matchingServerchans.length} matching ServerChan destination(s).`
              : `No enabled ServerChan config matches ${eventType}.`,
        },
        PUSH: {
          configured: vapidConfigured && pushSubs.length > 0,
          destinationCount: pushSubs.length,
          message: !vapidConfigured
            ? "VAPID keys are not configured."
            : pushSubs.length > 0
              ? `${pushSubs.length} enabled push subscription(s).`
              : "No enabled push subscriptions.",
        },
      };

      events[eventType] = CHANNEL_NAMES.reduce<Record<string, any>>(
        (channels, channelName) => {
          const presetEnabled =
            presets[eventType]?.[CHANNEL_KEY_BY_NAME[channelName]] ?? true;
          const diagnostic = base[channelName];
          channels[channelName] = {
            ...diagnostic,
            presetEnabled,
            severity: !presetEnabled
              ? "disabled"
              : diagnostic.configured
                ? "ok"
                : "warning",
            message: !presetEnabled
              ? "Preset disabled for this risk event."
              : diagnostic.message,
          };
          return channels;
        },
        {},
      );
      return events;
    },
    {},
  );
};

export const getRiskNotificationDeliverySummary = async (options?: {
  db?: ReturnType<typeof useDb>;
  now?: Date;
  dedupeWindowHours?: number;
}) => {
  const db = options?.db ?? useDb();
  const now = options?.now ?? new Date();
  const dedupeWindowHours = Math.max(
    1,
    Math.floor(options?.dedupeWindowHours || DEDUPE_WINDOW_HOURS),
  );
  const cutoff = now.getTime() - dedupeWindowHours * 60 * 60 * 1000;
  const riskEventSet = new Set<string>(RISK_NOTIFICATION_EVENT_TYPES);
  const channelDiagnostics = await getRiskNotificationChannelDiagnostics({
    db,
  });
  const rows = (await db.select().from(notificationEvents).all()).filter((row) =>
    riskEventSet.has(row.eventType),
  );

  const events = RISK_NOTIFICATION_EVENT_TYPES.reduce<Record<string, any>>(
    (acc, eventType) => {
      acc[eventType] = {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        lastCreatedAt: null,
        lastSentAt: null,
        lastFailedAt: null,
        dedupeKeysLastWindow: 0,
        lastDedupeKey: null,
        lastDedupeAt: null,
        channels: CHANNEL_NAMES.reduce<Record<string, any>>((channels, name) => {
          const diagnostic = channelDiagnostics[eventType]?.[name] || {};
          channels[name] = {
            total: 0,
            sent: 0,
            failed: 0,
            pending: 0,
            lastSentAt: null,
            lastFailedAt: null,
            diagnostic,
          };
          return channels;
        }, {}),
      };
      return acc;
    },
    {},
  );

  const dedupeKeysByEvent = RISK_NOTIFICATION_EVENT_TYPES.reduce<
    Record<string, Set<string>>
  >((acc, eventType) => {
    acc[eventType] = new Set<string>();
    return acc;
  }, {});

  rows.forEach((row) => {
    const eventSummary = events[row.eventType];
    if (!eventSummary) return;

    const channelName = String(row.channel || "").toUpperCase();
    const channelSummary =
      eventSummary.channels[channelName] ||
      (eventSummary.channels[channelName] = {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        lastSentAt: null,
        lastFailedAt: null,
        diagnostic: {},
      });

    eventSummary.total += 1;
    channelSummary.total += 1;

    const statusKey = String(row.status || "PENDING").toLowerCase();
    if (statusKey === "sent" || statusKey === "failed") {
      eventSummary[statusKey] += 1;
      channelSummary[statusKey] += 1;
    } else {
      eventSummary.pending += 1;
      channelSummary.pending += 1;
    }

    const createdAt = toIso(row.createdAt);
    if (createdAt && dateMs(createdAt) > dateMs(eventSummary.lastCreatedAt)) {
      eventSummary.lastCreatedAt = createdAt;
    }

    if (row.status === "SENT") {
      const sentAt = toIso(row.sentAt || row.createdAt);
      if (sentAt && dateMs(sentAt) > dateMs(eventSummary.lastSentAt)) {
        eventSummary.lastSentAt = sentAt;
      }
      if (sentAt && dateMs(sentAt) > dateMs(channelSummary.lastSentAt)) {
        channelSummary.lastSentAt = sentAt;
      }
    }

    if (row.status === "FAILED") {
      const failedAt = toIso(row.failedAt || row.createdAt);
      if (failedAt && dateMs(failedAt) > dateMs(eventSummary.lastFailedAt)) {
        eventSummary.lastFailedAt = failedAt;
      }
      if (failedAt && dateMs(failedAt) > dateMs(channelSummary.lastFailedAt)) {
        channelSummary.lastFailedAt = failedAt;
      }
    }

    const metadata = parseJson<Record<string, any>>(row.metadata, {});
    const dedupeKey = metadata.dedupeKey || metadata.eventData?.dedupeKey;
    const dedupeAt = dateMs(row.sentAt || row.createdAt);
    if (dedupeKey && dedupeAt >= cutoff) {
      dedupeKeysByEvent[row.eventType]?.add(String(dedupeKey));
      if (dedupeAt > dateMs(eventSummary.lastDedupeAt)) {
        eventSummary.lastDedupeKey = String(dedupeKey);
        eventSummary.lastDedupeAt = new Date(dedupeAt).toISOString();
      }
    }
  });

  RISK_NOTIFICATION_EVENT_TYPES.forEach((eventType) => {
    events[eventType].dedupeKeysLastWindow =
      dedupeKeysByEvent[eventType]?.size || 0;
  });

  return {
    dedupeWindowHours,
    events,
  };
};
