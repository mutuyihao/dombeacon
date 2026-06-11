import {
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
} from "drizzle-orm";
import { notificationEvents } from "../db/schema";

export const NOTIFICATION_EVENT_STATUSES = new Set([
  "PENDING",
  "SENT",
  "FAILED",
]);

export const NOTIFICATION_EVENT_CHANNELS = new Set([
  "EMAIL",
  "WEBHOOK",
  "SERVERCHAN",
  "PUSH",
]);

export type NotificationArchiveMode = "active" | "archived" | "all";

type NotificationFilterInput = {
  status?: unknown;
  channel?: unknown;
  eventType?: unknown;
  domainId?: unknown;
  from?: unknown;
  to?: unknown;
};

export const notificationFilterError = (message: string) =>
  Object.assign(new Error(message), {
    statusCode: 400,
    apiCode: 40000,
  });

const normalizeUpperText = (value: unknown) =>
  String(value ?? "").trim().toUpperCase();

const parseFilterDate = (value: unknown, label: string) => {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw notificationFilterError(`Invalid ${label} date`);
  }
  return date;
};

export const getNotificationArchiveMode = (
  value: unknown,
  fallback: NotificationArchiveMode = "active",
): NotificationArchiveMode => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["1", "true", "archived"].includes(normalized)) return "archived";
  if (normalized === "all") return "all";
  if (["0", "false", "active"].includes(normalized)) return "active";
  return fallback;
};

export const parseNotificationRecordIds = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  );
};

export const buildNotificationEventConditions = (
  input: NotificationFilterInput,
  options: {
    archivedMode?: NotificationArchiveMode;
    defaultStatus?: string;
  } = {},
) => {
  const conditions: any[] = [];
  const archivedMode = options.archivedMode ?? "active";

  if (archivedMode === "active") {
    conditions.push(isNull(notificationEvents.archivedAt));
  } else if (archivedMode === "archived") {
    conditions.push(isNotNull(notificationEvents.archivedAt));
  }

  const status =
    input.status === undefined
      ? normalizeUpperText(options.defaultStatus)
      : normalizeUpperText(input.status);
  if (status) {
    if (!NOTIFICATION_EVENT_STATUSES.has(status)) {
      throw notificationFilterError("Invalid notification status");
    }
    conditions.push(eq(notificationEvents.status, status));
  }

  const channel = normalizeUpperText(input.channel);
  if (channel) {
    if (!NOTIFICATION_EVENT_CHANNELS.has(channel)) {
      throw notificationFilterError("Invalid notification channel");
    }
    conditions.push(eq(notificationEvents.channel, channel));
  }

  const eventType = normalizeUpperText(input.eventType);
  if (eventType) {
    conditions.push(eq(notificationEvents.eventType, eventType));
  }

  if (
    input.domainId !== undefined &&
    input.domainId !== null &&
    input.domainId !== ""
  ) {
    const domainId = Number(input.domainId);
    if (!Number.isInteger(domainId) || domainId <= 0) {
      throw notificationFilterError("Invalid domainId");
    }
    conditions.push(eq(notificationEvents.domainId, domainId));
  }

  const fromDate = parseFilterDate(input.from, "from");
  const toDate = parseFilterDate(input.to, "to");
  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    throw notificationFilterError("Invalid date range");
  }
  if (fromDate) conditions.push(gte(notificationEvents.createdAt, fromDate));
  if (toDate) conditions.push(lte(notificationEvents.createdAt, toDate));

  return conditions;
};
