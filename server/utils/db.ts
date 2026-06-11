import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "../db/schema";
import { dirname, isAbsolute, resolve } from "node:path";
import { existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _resolvedPath: string | null = null;

/**
 * Resolve the SQLite file path:
 *   - Honors `DATABASE_PATH` if set (relative paths resolved from CWD).
 *   - Falls back to `./data/app.db`.
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

export const useDb = () => {
  if (!_db) {
    _resolvedPath = resolveDbPath();
    const journalMode = getJournalMode();
    if (journalMode === "DELETE") {
      removeStaleWalSidecars(_resolvedPath);
    }
    const sqlite = new Database(_resolvedPath, { timeout: 5000 });

    configureRuntimePragmas(sqlite, journalMode);

    _db = drizzle(sqlite, { schema });

    const migrationsFolder = resolve(process.cwd(), "server/db/migrations");
    migrate(_db, {
      migrationsFolder,
    });
  }
  return _db;
};

/**
 * Path actually opened by `useDb()` — handy for diagnostics endpoints.
 * Returns null until the DB has been opened at least once.
 */
export const getDbPath = () => _resolvedPath;
