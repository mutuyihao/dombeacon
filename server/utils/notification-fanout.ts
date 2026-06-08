import { and, eq, gte } from "drizzle-orm";
import { notificationEvents } from "../db/schema";
import { sendNotification } from "./mail";
import {
  applyNotificationChannelPreset,
  getNotificationEventChannels,
} from "./notification-preferences";
import { notifyPush } from "./push";
import { notifyServerchan } from "./serverchan";
import { notifyWebhooks } from "./webhook";

export type NotificationTemplateType =
  | "instant"
  | "daily"
  | "dropping_alert"
  | "action_created"
  | "risk_alert";

const parseMetadata = (value: string | null | undefined) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const wasDedupeKeyRecentlySent = async (params: {
  eventType: string;
  dedupeKey: string;
  hoursWindow?: number;
  domainId?: number | null;
  db?: ReturnType<typeof useDb>;
}) => {
  const hoursWindow = params.hoursWindow ?? 24;
  if (!params.dedupeKey || hoursWindow <= 0) return false;

  const cutoff = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);
  const db = params.db ?? useDb();
  const filters: any[] = [
    eq(notificationEvents.eventType, params.eventType),
    eq(notificationEvents.status, "SENT"),
    gte(notificationEvents.sentAt, cutoff),
  ];
  if (params.domainId) {
    filters.push(eq(notificationEvents.domainId, params.domainId));
  }

  const rows = await db
    .select()
    .from(notificationEvents)
    .where(and(...filters))
    .all();

  return rows.some((row) => {
    const metadata = parseMetadata(row.metadata) as Record<string, any>;
    return (
      metadata.dedupeKey === params.dedupeKey ||
      metadata.eventData?.dedupeKey === params.dedupeKey
    );
  });
};

export const fanoutNotification = async (params: {
  domainId?: number;
  actionId?: number;
  eventType: string;
  templateType?: NotificationTemplateType;
  templateData?: any;
  eventData: any;
  deduplicateHours?: number;
  dedupeKey?: string;
  channels?: {
    email?: boolean;
    webhook?: boolean;
    serverchan?: boolean;
    push?: boolean;
  };
}) => {
  const deduplicateHours = params.deduplicateHours ?? 24;
  const eventPreset = await getNotificationEventChannels(params.eventType);
  const channels = applyNotificationChannelPreset(params.channels, eventPreset);

  if (!Object.values(channels).some(Boolean)) {
    return { skipped: false, disabled: true, successCount: 0 };
  }

  if (
    params.dedupeKey &&
    (await wasDedupeKeyRecentlySent({
      eventType: params.eventType,
      dedupeKey: params.dedupeKey,
      hoursWindow: deduplicateHours,
      domainId: params.domainId,
    }))
  ) {
    return { skipped: true, successCount: 0 };
  }

  const eventData = {
    ...params.eventData,
    ...(params.dedupeKey ? { dedupeKey: params.dedupeKey } : {}),
  };
  const templateData = {
    ...(params.templateData || {}),
    ...(params.dedupeKey ? { dedupeKey: params.dedupeKey } : {}),
  };

  const tasks: Promise<any>[] = [];

  if (channels.email && params.templateType) {
    tasks.push(
      sendNotification({
        domainId: params.domainId,
        actionId: params.actionId,
        eventType: params.eventType,
        templateType: params.templateType,
        templateData,
        deduplicateHours: params.dedupeKey ? 0 : deduplicateHours,
      }),
    );
  }
  if (channels.webhook) {
    tasks.push(
      notifyWebhooks({
        domainId: params.domainId,
        actionId: params.actionId,
        eventType: params.eventType,
        eventData,
      }),
    );
  }
  if (channels.serverchan) {
    tasks.push(
      notifyServerchan({
        domainId: params.domainId,
        actionId: params.actionId,
        eventType: params.eventType,
        eventData,
      }),
    );
  }
  if (channels.push) {
    tasks.push(
      notifyPush({
        domainId: params.domainId,
        actionId: params.actionId,
        eventType: params.eventType,
        eventData,
      }),
    );
  }

  const results = await Promise.allSettled(tasks);
  const successCount = results.reduce((count, result) => {
    if (result.status !== "fulfilled") return count;
    if (typeof result.value === "number") return count + result.value;
    return count + (result.value ? 1 : 0);
  }, 0);

  return { skipped: false, successCount };
};
