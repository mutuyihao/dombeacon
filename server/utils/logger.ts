type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|secret|token|authorization|cookie|sendkey|api[-_]?key|auth|headers?|endpoint|p256dh|smtp[-_]?config|options[-_]?json)/i;

const getLogLevel = (): LogLevel => {
  const value = String(process.env.LOG_LEVEL || "info")
    .trim()
    .toLowerCase();
  return (["debug", "info", "warn", "error"].includes(value)
    ? value
    : "info") as LogLevel;
};

const useJsonLogs = () =>
  String(process.env.LOG_FORMAT || "")
    .trim()
    .toLowerCase() === "json";

const shouldLog = (level: LogLevel) =>
  LOG_LEVEL_RANK[level] >= LOG_LEVEL_RANK[getLogLevel()];

const redact = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack,
    };
  }
  if (!value || typeof value !== "object") return value;
  if (seen.has(value as object)) return "[circular]";
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : redact(item, seen),
    ]),
  );
};

export const redactLogMeta = (meta: Record<string, unknown>) =>
  redact(meta) as Record<string, unknown>;

const writeLog = (
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
) => {
  if (!shouldLog(level)) return;

  const safeMeta = meta ? redactLogMeta(meta) : undefined;
  if (useJsonLogs()) {
    console[level](
      JSON.stringify({
        level,
        time: new Date().toISOString(),
        message,
        ...(safeMeta && typeof safeMeta === "object" ? safeMeta : {}),
      }),
    );
    return;
  }

  if (safeMeta) {
    console[level](`[${level}] ${message}`, safeMeta);
  } else {
    console[level](`[${level}] ${message}`);
  }
};

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    writeLog("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    writeLog("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    writeLog("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    writeLog("error", message, meta),
};
