import { auditLogs } from "../db/schema";
import { getLoginClientKey } from "./auth";
import { useDb } from "./db";

const REDACTED = "[redacted]";
const CIRCULAR = "[circular]";
const MAX_METADATA_STRING_LENGTH = 500;
const MAX_METADATA_ARRAY_LENGTH = 50;

const sensitiveMetadataKeys = new Set([
  "apikey",
  "auth",
  "authorization",
  "cookie",
  "endpoint",
  "headers",
  "headersjson",
  "pass",
  "password",
  "p256dh",
  "secret",
  "sendkey",
  "smtpconfig",
  "smtpconfigjson",
  "token",
]);

export type AuditLogInput = {
  event?: any;
  eventType: string;
  outcome?: string;
  actorType?: string;
  actorId?: string | null;
  metadata?: unknown;
};

const normalizeMetadataKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");

const isSensitiveMetadataKey = (key: string) => {
  const normalized = normalizeMetadataKey(key);
  return (
    sensitiveMetadataKeys.has(normalized) ||
    normalized.endsWith("password") ||
    normalized.endsWith("secret") ||
    normalized.endsWith("token") ||
    normalized.endsWith("pass")
  );
};

const truncateAuditText = (value: string) => {
  if (value.length <= MAX_METADATA_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_METADATA_STRING_LENGTH)}...`;
};

const readHeader = (event: any, name: string) => {
  const headers = event?.node?.req?.headers || {};
  const value = headers[name] || headers[name.toLowerCase()];
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
};

export const getAuditClient = (event: any) => ({
  ipAddress: getLoginClientKey(event),
  userAgent: truncateAuditText(readHeader(event, "user-agent")),
});

export const sanitizeAuditMetadata = (
  value: unknown,
  seen = new WeakSet<object>(),
): unknown => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const valueType = typeof value;
  if (valueType === "string") return truncateAuditText(value as string);
  if (valueType === "number" || valueType === "boolean") return value;
  if (valueType === "bigint") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (valueType !== "object") return undefined;

  const objectValue = value as object;
  if (seen.has(objectValue)) return CIRCULAR;
  seen.add(objectValue);

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_METADATA_ARRAY_LENGTH)
      .map((item) => sanitizeAuditMetadata(item, seen));
  }

  const sanitized: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    const sanitizedValue = isSensitiveMetadataKey(key)
      ? REDACTED
      : sanitizeAuditMetadata(item, seen);
    if (sanitizedValue !== undefined) {
      sanitized[key] = sanitizedValue;
    }
  });
  return sanitized;
};

export const recordAuditEvent = async ({
  event,
  eventType,
  outcome = "success",
  actorType = "admin",
  actorId = "admin",
  metadata,
}: AuditLogInput) => {
  try {
    const client = event
      ? getAuditClient(event)
      : { ipAddress: "", userAgent: "" };
    const sanitizedMetadata = sanitizeAuditMetadata(metadata);
    await useDb()
      .insert(auditLogs)
      .values({
        eventType,
        actorType,
        actorId,
        ipAddress: client.ipAddress || null,
        userAgent: client.userAgent || null,
        outcome,
        metadata:
          sanitizedMetadata === undefined
            ? null
            : JSON.stringify(sanitizedMetadata),
        createdAt: new Date(),
      });
  } catch (error: any) {
    console.warn("Audit log write failed:", error?.message || error);
  }
};
