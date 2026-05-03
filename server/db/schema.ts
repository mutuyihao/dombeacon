import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const domains = sqliteTable("domains", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domain: text("domain").notNull().unique(),
  watchKind: text("watch_kind").notNull().default("WANTED"), // 'OWNED' | 'WANTED'
  priority: text("priority").notNull().default("MEDIUM"), // 'LOW' | 'MEDIUM' | 'HIGH'
  note: text("note"),
  tagsJson: text("tags_json").default("[]"),
  groupName: text("group_name"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const domainStatusLatest = sqliteTable("domain_status_latest", {
  domainId: integer("domain_id")
    .references(() => domains.id, { onDelete: "cascade" })
    .primaryKey(),
  status: text("status").notNull(), // AVAILABLE, REGISTERED, EXPIRING, PENDING_DELETE, UNKNOWN
  checkedAt: integer("checked_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  registrar: text("registrar"),
  nameserversJson: text("nameservers_json"),
  source: text("source"), // rdap, whois
  rawSnapshot: text("raw_snapshot"),
  parseReason: text("parse_reason"),
  lastError: text("last_error"),
  lastErrorAt: integer("last_error_at", { mode: "timestamp" }),
});

export const domainStatusHistory = sqliteTable("domain_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domainId: integer("domain_id").references(() => domains.id, {
    onDelete: "cascade",
  }),
  status: text("status").notNull(),
  checkedAt: integer("checked_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  source: text("source"),
  rawSnapshot: text("raw_snapshot"),
  parseReason: text("parse_reason"),
});

export const notificationRules = sqliteTable("notification_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  instantEnabled: integer("instant_enabled", { mode: "boolean" }).default(
    false,
  ),
  dailyEnabled: integer("daily_enabled", { mode: "boolean" }).default(false),
  targetEmail: text("target_email"),
  smtpConfigJson: text("smtp_config_json"), // host, port, user, pass, from
});

export const taskLocks = sqliteTable("task_locks", {
  taskName: text("task_name").primaryKey(),
  lockedUntil: integer("locked_until", { mode: "timestamp" }),
  ownerId: text("owner_id"),
});

export const taskRuns = sqliteTable("task_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskName: text("task_name"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  resultJson: text("result_json"),
});

export const actions = sqliteTable("actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domainId: integer("domain_id")
    .references(() => domains.id, { onDelete: "cascade" })
    .notNull(),
  actionType: text("action_type").notNull(), // 'WANTED_AVAILABLE' | 'WANTED_DROPPING' | 'OWNED_EXPIRING' | 'SCAN_FAILED'
  status: text("status").notNull().default("OPEN"), // 'OPEN' | 'SNOOZED' | 'DISMISSED' | 'RESOLVED'
  priority: text("priority").notNull(), // Inherited from domain: 'LOW' | 'MEDIUM' | 'HIGH'
  triggeredAt: integer("triggered_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  snoozedUntil: integer("snoozed_until", { mode: "timestamp" }),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  metadata: text("metadata"), // JSON: { oldStatus, newStatus, expiresAt, error, etc. }
});

// New table for notification event tracking and deduplication
export const notificationEvents = sqliteTable("notification_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domainId: integer("domain_id").references(() => domains.id, {
    onDelete: "cascade",
  }),
  actionId: integer("action_id").references(() => actions.id, {
    onDelete: "cascade",
  }),
  eventType: text("event_type").notNull(), // 'STATUS_CHANGE' | 'EXPIRING_SOON' | 'SCAN_FAILED' | 'DAILY_SUMMARY'
  channel: text("channel").notNull(), // 'EMAIL' | 'WEBHOOK' | 'SERVERCHAN'
  status: text("status").notNull().default("PENDING"), // 'PENDING' | 'SENT' | 'FAILED'
  sentAt: integer("sent_at", { mode: "timestamp" }),
  failedAt: integer("failed_at", { mode: "timestamp" }),
  errorMessage: text("error_message"),
  metadata: text("metadata"), // JSON: additional context
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// New table for webhook configurations (v1.1)
export const webhookConfigs = sqliteTable("webhook_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  method: text("method").notNull().default("POST"), // 'POST' | 'GET'
  headersJson: text("headers_json"), // JSON: custom headers
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  eventTypes: text("event_types"), // JSON array: which events to send
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// Server酱配置表 (v1.1)
export const serverchanConfigs = sqliteTable("serverchan_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sendKey: text("send_key").notNull(), // Server酱 SendKey
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  eventTypes: text("event_types"), // JSON array: which events to send
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});
