import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const domains = sqliteTable("domains", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  domain: text("domain").notNull().unique(),
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
  status: text("status").notNull(), // AVAILABLE, REGISTERED, EXPIRING, DROPPING, UNKNOWN
  checkedAt: integer("checked_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  registrar: text("registrar"),
  nameserversJson: text("nameservers_json"),
  source: text("source"), // rdap, whois
  rawSnapshot: text("raw_snapshot"),
  parseReason: text("parse_reason"),
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
