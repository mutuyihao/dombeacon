import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../db/schema";
import { join } from "path";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export const useDb = () => {
  if (!_db) {
    const sqlite = new Database("data/app.db");
    _db = drizzle(sqlite, { schema });
  }
  return _db;
};
