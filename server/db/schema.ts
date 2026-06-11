import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const domains = sqliteTable(
  "domains",
  {
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
  },
  (table) => ({
    watchKindIdx: index("idx_domains_watch_kind_v12").on(table.watchKind),
    priorityIdx: index("idx_domains_priority_v12").on(table.priority),
    isActiveIdx: index("idx_domains_is_active_v12").on(table.isActive),
    groupNameIdx: index("idx_domains_group_name_v12").on(table.groupName),
  }),
);

export const domainStatusLatest = sqliteTable(
  "domain_status_latest",
  {
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
    rdapSummaryJson: text("rdap_summary_json"),
    parseReason: text("parse_reason"),
    lastError: text("last_error"),
    lastErrorAt: integer("last_error_at", { mode: "timestamp" }),
  },
  (table) => ({
    statusIdx: index("idx_domain_status_latest_status_v12").on(table.status),
    expiresAtIdx: index("idx_domain_status_latest_expires_at_v12").on(
      table.expiresAt,
    ),
  }),
);

export const domainStatusHistory = sqliteTable(
  "domain_status_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    domainId: integer("domain_id").references(() => domains.id, {
      onDelete: "cascade",
    }),
    status: text("status").notNull(),
    checkedAt: integer("checked_at", { mode: "timestamp" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    source: text("source"),
    rawSnapshot: text("raw_snapshot"),
    rdapSummaryJson: text("rdap_summary_json"),
    parseReason: text("parse_reason"),
  },
  (table) => ({
    domainIdIdx: index("idx_domain_status_history_domain_id").on(
      table.domainId,
    ),
  }),
);

export const notificationRules = sqliteTable("notification_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  instantEnabled: integer("instant_enabled", { mode: "boolean" }).default(
    false,
  ),
  dailyEnabled: integer("daily_enabled", { mode: "boolean" }).default(false),
  targetEmail: text("target_email"),
  smtpConfigJson: text("smtp_config_json"), // host, port, user, pass, from
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventType: text("event_type").notNull(),
    actorType: text("actor_type").notNull().default("anonymous"),
    actorId: text("actor_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    outcome: text("outcome").notNull().default("success"),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
  },
  (table) => ({
    eventTypeIdx: index("idx_audit_logs_event_type_v12").on(table.eventType),
    outcomeIdx: index("idx_audit_logs_outcome_v12").on(table.outcome),
    createdAtIdx: index("idx_audit_logs_created_at_v12").on(table.createdAt),
  }),
);

export const dnsSnapshots = sqliteTable(
  "dns_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    domainId: integer("domain_id").references(() => domains.id, {
      onDelete: "cascade",
    }).notNull(),
    recordsJson: text("records_json").notNull(),
    recordHash: text("record_hash").notNull(),
    source: text("source").notNull().default("dns"),
    error: text("error"),
    checkedAt: integer("checked_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
  },
  (table) => ({
    domainIdIdx: index("idx_dns_snapshots_domain_id_v12").on(table.domainId),
    recordHashIdx: index("idx_dns_snapshots_record_hash_v12").on(
      table.recordHash,
    ),
    checkedAtIdx: index("idx_dns_snapshots_checked_at_v12").on(
      table.checkedAt,
    ),
  }),
);

export const riskFindings = sqliteTable(
  "risk_findings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    domainId: integer("domain_id").references(() => domains.id, {
      onDelete: "cascade",
    }).notNull(),
    findingType: text("finding_type").notNull(),
    severity: text("severity").notNull().default("LOW"),
    status: text("status").notNull().default("OPEN"),
    evidenceJson: text("evidence_json"),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
    snoozedUntil: integer("snoozed_until", { mode: "timestamp" }),
    resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  },
  (table) => ({
    domainIdIdx: index("idx_risk_findings_domain_id_v12").on(table.domainId),
    findingTypeIdx: index("idx_risk_findings_finding_type_v12").on(
      table.findingType,
    ),
    severityIdx: index("idx_risk_findings_severity_v12").on(table.severity),
    statusIdx: index("idx_risk_findings_status_v12").on(table.status),
    lastSeenAtIdx: index("idx_risk_findings_last_seen_at_v12").on(
      table.lastSeenAt,
    ),
  }),
);

export const domainRiskSummaries = sqliteTable(
  "domain_risk_summaries",
  {
    domainId: integer("domain_id")
      .references(() => domains.id, { onDelete: "cascade" })
      .primaryKey(),
    riskScore: integer("risk_score").notNull().default(0),
    openFindingsCount: integer("open_findings_count").notNull().default(0),
    highestSeverity: text("highest_severity"),
    lastSecurityScanAt: integer("last_security_scan_at", {
      mode: "timestamp",
    }),
    dnssecStatus: text("dnssec_status").notNull().default("UNKNOWN"),
    dmarcPolicy: text("dmarc_policy").notNull().default("unknown"),
    registrarLockStatus: text("registrar_lock_status")
      .notNull()
      .default("UNKNOWN"),
    spfConfigured: integer("spf_configured", { mode: "boolean" })
      .notNull()
      .default(false),
    caaConfigured: integer("caa_configured", { mode: "boolean" })
      .notNull()
      .default(false),
    bimiConfigured: integer("bimi_configured", { mode: "boolean" })
      .notNull()
      .default(false),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
  },
  (table) => ({
    riskScoreIdx: index("idx_domain_risk_summaries_risk_score_v14").on(
      table.riskScore,
    ),
    openFindingsIdx: index(
      "idx_domain_risk_summaries_open_findings_v14",
    ).on(table.openFindingsCount),
  }),
);

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

export const actions = sqliteTable(
  "actions",
  {
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
    archivedAt: integer("archived_at", { mode: "timestamp" }),
    metadata: text("metadata"), // JSON: { oldStatus, newStatus, expiresAt, error, etc. }
  },
  (table) => ({
    triggeredAtIdx: index("idx_actions_triggered_at_v12").on(table.triggeredAt),
    actionTypeIdx: index("idx_actions_action_type_v12").on(table.actionType),
    archivedAtIdx: index("idx_actions_archived_at_v13").on(table.archivedAt),
  }),
);

// New table for notification event tracking and deduplication
export const notificationEvents = sqliteTable(
  "notification_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    domainId: integer("domain_id").references(() => domains.id, {
      onDelete: "cascade",
    }),
    actionId: integer("action_id").references(() => actions.id, {
      onDelete: "cascade",
    }),
    eventType: text("event_type").notNull(), // 'STATUS_CHANGE' | 'EXPIRING_SOON' | 'SCAN_FAILED' | 'DAILY_SUMMARY'
    channel: text("channel").notNull(), // 'EMAIL' | 'WEBHOOK' | 'SERVERCHAN' | 'PUSH'
    status: text("status").notNull().default("PENDING"), // 'PENDING' | 'SENT' | 'FAILED'
    sentAt: integer("sent_at", { mode: "timestamp" }),
    failedAt: integer("failed_at", { mode: "timestamp" }),
    errorMessage: text("error_message"),
    metadata: text("metadata"), // JSON: additional context
    retryOf: integer("retry_of"), // ID of original notification_event that this is a retry of
    archivedAt: integer("archived_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
  },
  (table) => ({
    domainIdIdx: index("idx_notification_events_domain_id_v12").on(
      table.domainId,
    ),
    eventTypeIdx: index("idx_notification_events_event_type_v12").on(
      table.eventType,
    ),
    statusIdx: index("idx_notification_events_status_v12").on(table.status),
    channelIdx: index("idx_notification_events_channel_v12").on(table.channel),
    createdAtIdx: index("idx_notification_events_created_at_v12").on(
      table.createdAt,
    ),
    sentAtIdx: index("idx_notification_events_sent_at_v12").on(table.sentAt),
    archivedAtIdx: index("idx_notification_events_archived_at_v13").on(
      table.archivedAt,
    ),
  }),
);

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
  optionsJson: text("options_json"), // Protected JSON: channel/noip/openid/tags/title prefix
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// SSL 证书状态表 (v1.1)
export const sslStatusLatest = sqliteTable(
  "ssl_status_latest",
  {
    domainId: integer("domain_id")
      .references(() => domains.id, { onDelete: "cascade" })
      .primaryKey(),
    checkedHost: text("checked_host"),
    hasSSL: integer("has_ssl", { mode: "boolean" }).default(false),
    isValid: integer("is_valid", { mode: "boolean" }).default(false),
    issuer: text("issuer"),
    validFrom: integer("valid_from", { mode: "timestamp" }),
    validTo: integer("valid_to", { mode: "timestamp" }),
    daysUntilExpiry: integer("days_until_expiry"),
    checkedAt: integer("checked_at", { mode: "timestamp" }),
    validationError: text("validation_error"),
    lastError: text("last_error"),
    lastErrorAt: integer("last_error_at", { mode: "timestamp" }),
  },
  (table) => ({
    daysUntilExpiryIdx: index("idx_ssl_status_latest_days_until_expiry_v12").on(
      table.daysUntilExpiry,
    ),
    validToIdx: index("idx_ssl_status_latest_valid_to_v12").on(table.validTo),
  }),
);

// SSL 证书历史记录表 (v1.1)
export const sslStatusHistory = sqliteTable(
  "ssl_status_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    domainId: integer("domain_id").references(() => domains.id, {
      onDelete: "cascade",
    }),
    checkedHost: text("checked_host"),
    hasSSL: integer("has_ssl", { mode: "boolean" }),
    isValid: integer("is_valid", { mode: "boolean" }),
    issuer: text("issuer"),
    validFrom: integer("valid_from", { mode: "timestamp" }),
    validTo: integer("valid_to", { mode: "timestamp" }),
    daysUntilExpiry: integer("days_until_expiry"),
    validationError: text("validation_error"),
    checkedAt: integer("checked_at", { mode: "timestamp" }),
  },
  (table) => ({
    domainIdIdx: index("idx_ssl_status_history_domain_id").on(table.domainId),
  }),
);

// 域名成本表 (v1.1)
export const domainCosts = sqliteTable(
  "domain_costs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    domainId: integer("domain_id")
      .references(() => domains.id, { onDelete: "cascade" })
      .notNull(),
    costType: text("cost_type").notNull(), // 'REGISTRATION' | 'RENEWAL' | 'TRANSFER' | 'PRIVACY' | 'OTHER'
    amount: integer("amount").notNull(), // Stored in cents (USD * 100)
    currency: text("currency").notNull().default("USD"), // ISO 4217 currency code
    registrar: text("registrar"),
    paymentDate: integer("payment_date", { mode: "timestamp" }).notNull(),
    periodStart: integer("period_start", { mode: "timestamp" }),
    periodEnd: integer("period_end", { mode: "timestamp" }),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
  },
  (table) => ({
    domainIdIdx: index("idx_domain_costs_domain_id_v12").on(table.domainId),
    paymentDateIdx: index("idx_domain_costs_payment_date_v12").on(
      table.paymentDate,
    ),
    costTypeIdx: index("idx_domain_costs_cost_type_v12").on(table.costType),
  }),
);

// 域名预算表 (v1.1)
export const domainBudgets = sqliteTable("domain_budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  amount: integer("amount").notNull(), // Stored in cents
  currency: text("currency").notNull().default("USD"),
  period: text("period").notNull().default("YEARLY"), // 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }),
  alertThreshold: integer("alert_threshold").default(80), // Percentage
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// Web Push subscriptions (v1.2)
export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    endpoint: text("endpoint").notNull().unique(),
    endpointHash: text("endpoint_hash"),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    enabled: integer("enabled", { mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date(),
    ),
  },
  (table) => ({
    endpointHashIdx: index("idx_push_subscriptions_endpoint_hash_v14").on(
      table.endpointHash,
    ),
    enabledIdx: index("idx_push_subscriptions_enabled_v12").on(table.enabled),
  }),
);

// Saved filter presets (v1.2)
export const savedFilters = sqliteTable("saved_filters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  criteriaJson: text("criteria_json").notNull(), // JSON: filter criteria
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});
