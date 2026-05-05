import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../db/schema";
import { dirname, isAbsolute, resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

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

    sqlite.exec(`
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
    const sqlite = new Database(_resolvedPath, { timeout: 5000 });

    // Safe defaults for single-instance Docker usage.
    // These should not change schema/data, only runtime behavior.
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
    sqlite.pragma("busy_timeout = 5000");
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
