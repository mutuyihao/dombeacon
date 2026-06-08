import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../db/schema";
import { dirname, isAbsolute, resolve } from "node:path";
import { existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _resolvedPath: string | null = null;

/**
 * Resolve the SQLite file path:
 *   - Honors `DATABASE_PATH` if set (relative paths resolved from CWD).
 *   - Falls back to `./data/app.db` to preserve existing on-disk data for
 *     users who never set the env var.
 *   - Ensures the parent directory exists so better-sqlite3 doesn't crash on
 *     fresh installs / first Docker boot.
 */
const resolveDbPath = (): string => {
  const raw = (process.env.DATABASE_PATH || "").trim();
  const target = raw || "./data/app.db";
  const abs = isAbsolute(target) ? target : resolve(process.cwd(), target);

  const parent = dirname(abs);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }
  return abs;
};

const hasTable = (sqlite: any, tableName: string): boolean => {
  return Boolean(
    sqlite
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get(tableName),
  );
};

const hasColumn = (
  sqlite: any,
  tableName: string,
  columnName: string,
): boolean => {
  if (!hasTable(sqlite, tableName)) return false;
  return sqlite
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .some((column: { name: string }) => column.name === columnName);
};

const createIndexIfReady = (
  sqlite: any,
  tableName: string,
  columnNames: string[],
  statement: string,
) => {
  if (
    hasTable(sqlite, tableName) &&
    columnNames.every((columnName) => hasColumn(sqlite, tableName, columnName))
  ) {
    sqlite.exec(statement);
  }
};

const addColumnIfMissing = (
  sqlite: any,
  tableName: string,
  columnName: string,
  statement: string,
) => {
  if (hasTable(sqlite, tableName) && !hasColumn(sqlite, tableName, columnName)) {
    sqlite.exec(statement);
  }
};

const getJournalMode = () =>
  String(process.env.SQLITE_JOURNAL_MODE || "DELETE")
    .trim()
    .toUpperCase() === "WAL"
    ? "WAL"
    : "DELETE";

const removeStaleWalSidecars = (dbPath: string) => {
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  const hasWal = existsSync(walPath);
  const hasShm = existsSync(shmPath);
  if (hasWal && statSync(walPath).size !== 0) return;
  if (!hasWal && !hasShm) return;

  for (const sidecarPath of [walPath, shmPath]) {
    try {
      if (existsSync(sidecarPath)) unlinkSync(sidecarPath);
    } catch {
      // Best-effort cleanup only; SQLite will surface any real I/O issue.
    }
  }
};

const configureRuntimePragmas = (sqlite: any, journalMode: "DELETE" | "WAL") => {
  sqlite.pragma("foreign_keys = ON");

  try {
    sqlite.pragma(`journal_mode = ${journalMode}`);
  } catch (error: any) {
    if (journalMode !== "WAL") {
      throw error;
    }

    try {
      sqlite.pragma("journal_mode = DELETE");
      console.warn(
        `SQLite WAL mode unavailable; falling back to DELETE journal mode: ${error?.code || error?.message || String(error)}`,
      );
    } catch {
      throw error;
    }
  }

  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
};

const compatibilityIndexes = [
  {
    tableName: "domains",
    columnNames: ["watch_kind"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_domains_watch_kind_v12 ON domains(watch_kind)",
  },
  {
    tableName: "domains",
    columnNames: ["priority"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_domains_priority_v12 ON domains(priority)",
  },
  {
    tableName: "domains",
    columnNames: ["is_active"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_domains_is_active_v12 ON domains(is_active)",
  },
  {
    tableName: "domains",
    columnNames: ["group_name"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_domains_group_name_v12 ON domains(group_name)",
  },
  {
    tableName: "domain_status_latest",
    columnNames: ["status"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_domain_status_latest_status_v12 ON domain_status_latest(status)",
  },
  {
    tableName: "domain_status_latest",
    columnNames: ["expires_at"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_domain_status_latest_expires_at_v12 ON domain_status_latest(expires_at)",
  },
  {
    tableName: "domain_status_history",
    columnNames: ["domain_id", "id"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_domain_status_history_domain_id_id_v12 ON domain_status_history(domain_id, id)",
  },
  {
    tableName: "actions",
    columnNames: ["triggered_at"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_actions_triggered_at_v12 ON actions(triggered_at)",
  },
  {
    tableName: "actions",
    columnNames: ["action_type"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_actions_action_type_v12 ON actions(action_type)",
  },
  {
    tableName: "notification_events",
    columnNames: ["domain_id"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_notification_events_domain_id_v12 ON notification_events(domain_id)",
  },
  {
    tableName: "notification_events",
    columnNames: ["event_type"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_notification_events_event_type_v12 ON notification_events(event_type)",
  },
  {
    tableName: "notification_events",
    columnNames: ["status"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_notification_events_status_v12 ON notification_events(status)",
  },
  {
    tableName: "notification_events",
    columnNames: ["channel"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_notification_events_channel_v12 ON notification_events(channel)",
  },
  {
    tableName: "notification_events",
    columnNames: ["created_at"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_notification_events_created_at_v12 ON notification_events(created_at)",
  },
  {
    tableName: "notification_events",
    columnNames: ["sent_at"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_notification_events_sent_at_v12 ON notification_events(sent_at)",
  },
  {
    tableName: "ssl_status_latest",
    columnNames: ["days_until_expiry"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_ssl_status_latest_days_until_expiry_v12 ON ssl_status_latest(days_until_expiry)",
  },
  {
    tableName: "ssl_status_latest",
    columnNames: ["valid_to"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_ssl_status_latest_valid_to_v12 ON ssl_status_latest(valid_to)",
  },
  {
    tableName: "domain_costs",
    columnNames: ["domain_id"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_domain_costs_domain_id_v12 ON domain_costs(domain_id)",
  },
  {
    tableName: "domain_costs",
    columnNames: ["payment_date"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_domain_costs_payment_date_v12 ON domain_costs(payment_date)",
  },
  {
    tableName: "domain_costs",
    columnNames: ["cost_type"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_domain_costs_cost_type_v12 ON domain_costs(cost_type)",
  },
  {
    tableName: "push_subscriptions",
    columnNames: ["enabled"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled_v12 ON push_subscriptions(enabled)",
  },
  {
    tableName: "audit_logs",
    columnNames: ["event_type"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type_v12 ON audit_logs(event_type)",
  },
  {
    tableName: "audit_logs",
    columnNames: ["outcome"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome_v12 ON audit_logs(outcome)",
  },
  {
    tableName: "audit_logs",
    columnNames: ["created_at"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_v12 ON audit_logs(created_at)",
  },
  {
    tableName: "dns_snapshots",
    columnNames: ["domain_id"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_dns_snapshots_domain_id_v12 ON dns_snapshots(domain_id)",
  },
  {
    tableName: "dns_snapshots",
    columnNames: ["record_hash"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_dns_snapshots_record_hash_v12 ON dns_snapshots(record_hash)",
  },
  {
    tableName: "dns_snapshots",
    columnNames: ["checked_at"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_dns_snapshots_checked_at_v12 ON dns_snapshots(checked_at)",
  },
  {
    tableName: "risk_findings",
    columnNames: ["domain_id"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_risk_findings_domain_id_v12 ON risk_findings(domain_id)",
  },
  {
    tableName: "risk_findings",
    columnNames: ["finding_type"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_risk_findings_finding_type_v12 ON risk_findings(finding_type)",
  },
  {
    tableName: "risk_findings",
    columnNames: ["severity"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_risk_findings_severity_v12 ON risk_findings(severity)",
  },
  {
    tableName: "risk_findings",
    columnNames: ["status"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_risk_findings_status_v12 ON risk_findings(status)",
  },
  {
    tableName: "risk_findings",
    columnNames: ["last_seen_at"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_risk_findings_last_seen_at_v12 ON risk_findings(last_seen_at)",
  },
  {
    tableName: "brand_watch_terms",
    columnNames: ["normalized_term"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_brand_watch_terms_normalized_term_v12 ON brand_watch_terms(normalized_term)",
  },
  {
    tableName: "brand_watch_terms",
    columnNames: ["enabled"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_brand_watch_terms_enabled_v12 ON brand_watch_terms(enabled)",
  },
  {
    tableName: "brand_watch_terms",
    columnNames: ["severity"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_brand_watch_terms_severity_v12 ON brand_watch_terms(severity)",
  },
  {
    tableName: "brand_watch_candidates",
    columnNames: ["term_id"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_brand_watch_candidates_term_id_v12 ON brand_watch_candidates(term_id)",
  },
  {
    tableName: "brand_watch_candidates",
    columnNames: ["domain"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_brand_watch_candidates_domain_v12 ON brand_watch_candidates(domain)",
  },
  {
    tableName: "brand_watch_candidates",
    columnNames: ["status"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_brand_watch_candidates_status_v12 ON brand_watch_candidates(status)",
  },
  {
    tableName: "brand_watch_candidates",
    columnNames: ["review_status"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_brand_watch_candidates_review_status_v12 ON brand_watch_candidates(review_status)",
  },
  {
    tableName: "brand_watch_candidates",
    columnNames: ["last_seen_at"],
    statement:
      "CREATE INDEX IF NOT EXISTS idx_brand_watch_candidates_last_seen_at_v12 ON brand_watch_candidates(last_seen_at)",
  },
];

const ensureSchemaCompatibility = (sqlite: any) => {
  sqlite.exec("BEGIN");
  try {
    if (
      hasTable(sqlite, "notification_events") &&
      !hasColumn(sqlite, "notification_events", "retry_of")
    ) {
      sqlite.exec("ALTER TABLE notification_events ADD COLUMN retry_of INTEGER");
    }

    addColumnIfMissing(
      sqlite,
      "ssl_status_latest",
      "checked_host",
      "ALTER TABLE ssl_status_latest ADD COLUMN checked_host TEXT",
    );
    addColumnIfMissing(
      sqlite,
      "ssl_status_latest",
      "validation_error",
      "ALTER TABLE ssl_status_latest ADD COLUMN validation_error TEXT",
    );
    addColumnIfMissing(
      sqlite,
      "ssl_status_history",
      "checked_host",
      "ALTER TABLE ssl_status_history ADD COLUMN checked_host TEXT",
    );
    addColumnIfMissing(
      sqlite,
      "ssl_status_history",
      "validation_error",
      "ALTER TABLE ssl_status_history ADD COLUMN validation_error TEXT",
    );
    addColumnIfMissing(
      sqlite,
      "brand_watch_candidates",
      "review_status",
      "ALTER TABLE brand_watch_candidates ADD COLUMN review_status TEXT NOT NULL DEFAULT 'OPEN'",
    );
    addColumnIfMissing(
      sqlite,
      "brand_watch_candidates",
      "review_note",
      "ALTER TABLE brand_watch_candidates ADD COLUMN review_note TEXT",
    );
    addColumnIfMissing(
      sqlite,
      "brand_watch_candidates",
      "reviewed_at",
      "ALTER TABLE brand_watch_candidates ADD COLUMN reviewed_at INTEGER",
    );
    addColumnIfMissing(
      sqlite,
      "brand_watch_candidates",
      "reviewed_by",
      "ALTER TABLE brand_watch_candidates ADD COLUMN reviewed_by TEXT",
    );

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        enabled INTEGER DEFAULT 1,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS saved_filters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        criteria_json TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        actor_type TEXT NOT NULL DEFAULT 'anonymous',
        actor_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        outcome TEXT NOT NULL DEFAULT 'success',
        metadata TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS dns_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
        records_json TEXT NOT NULL,
        record_hash TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'dns',
        error TEXT,
        checked_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS risk_findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
        finding_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'LOW',
        status TEXT NOT NULL DEFAULT 'OPEN',
        evidence_json TEXT,
        first_seen_at INTEGER,
        last_seen_at INTEGER,
        snoozed_until INTEGER,
        resolved_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS brand_watch_terms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL,
        normalized_term TEXT NOT NULL,
        term_type TEXT NOT NULL DEFAULT 'BRAND',
        match_strategy TEXT NOT NULL DEFAULT 'STANDARD',
        tlds_json TEXT NOT NULL DEFAULT '["com","net","org"]',
        severity TEXT NOT NULL DEFAULT 'MEDIUM',
        enabled INTEGER DEFAULT 1,
        scan_frequency_hours INTEGER DEFAULT 24,
        last_scanned_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS brand_watch_candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        term_id INTEGER NOT NULL REFERENCES brand_watch_terms(id) ON DELETE CASCADE,
        domain TEXT NOT NULL,
        label TEXT NOT NULL,
        tld TEXT NOT NULL,
        mutation_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'UNKNOWN',
        severity TEXT NOT NULL DEFAULT 'MEDIUM',
        source TEXT NOT NULL DEFAULT 'rdap',
        evidence_json TEXT,
        review_status TEXT NOT NULL DEFAULT 'OPEN',
        review_note TEXT,
        reviewed_at INTEGER,
        reviewed_by TEXT,
        first_seen_at INTEGER,
        last_seen_at INTEGER,
        checked_at INTEGER,
        last_error TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    compatibilityIndexes.forEach(({ tableName, columnNames, statement }) =>
      createIndexIfReady(sqlite, tableName, columnNames, statement),
    );

    sqlite.exec("COMMIT");
  } catch (error) {
    sqlite.exec("ROLLBACK");
    throw error;
  }
};

export const useDb = () => {
  if (!_db) {
    _resolvedPath = resolveDbPath();
    const journalMode = getJournalMode();
    if (journalMode === "DELETE") {
      removeStaleWalSidecars(_resolvedPath);
    }
    const sqlite = new Database(_resolvedPath, { timeout: 5000 });

    // Safe defaults for single-instance Docker usage.
    // These should not change schema/data, only runtime behavior.
    configureRuntimePragmas(sqlite, journalMode);
    ensureSchemaCompatibility(sqlite);

    _db = drizzle(sqlite, { schema });
  }
  return _db;
};

/**
 * Path actually opened by `useDb()` — handy for diagnostics endpoints.
 * Returns null until the DB has been opened at least once.
 */
export const getDbPath = () => _resolvedPath;
