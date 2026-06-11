import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../server/db/schema";
import { DEFAULT_COST_CURRENCY } from "../server/utils/currency";

const createSettingsDb = () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER
    );
  `);

  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
  };
};

const importSettingsWithDb = async (db: ReturnType<typeof drizzle>) => {
  vi.doMock("../server/db", () => ({ db }));
  return import("../server/utils/settings");
};

describe("application settings helpers", () => {
  let sqlite: Database.Database | null = null;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    sqlite?.close();
    sqlite = null;
    vi.restoreAllMocks();
  });

  it("falls back to the default cost currency when unset or invalid", async () => {
    const created = createSettingsDb();
    sqlite = created.sqlite;
    const { db } = created;
    const { getCostCurrency } = await importSettingsWithDb(db);

    expect(await getCostCurrency()).toBe(DEFAULT_COST_CURRENCY);

    await db.insert(schema.appSettings).values({
      key: "cost.currency",
      value: "btc",
    });

    expect(await getCostCurrency()).toBe(DEFAULT_COST_CURRENCY);
  });

  it("normalizes and upserts supported cost currencies", async () => {
    const created = createSettingsDb();
    sqlite = created.sqlite;
    const { db } = created;
    const { getCostCurrency, setCostCurrency } = await importSettingsWithDb(db);

    await expect(setCostCurrency(" cny ")).resolves.toBe("CNY");
    await expect(getCostCurrency()).resolves.toBe("CNY");

    await expect(setCostCurrency("USD")).resolves.toBe("USD");
    await expect(getCostCurrency()).resolves.toBe("USD");
  });

  it("rejects unsupported cost currencies without writing them", async () => {
    const created = createSettingsDb();
    sqlite = created.sqlite;
    const { db } = created;
    const { getCostCurrency, setCostCurrency } = await importSettingsWithDb(db);

    await expect(setCostCurrency("btc")).rejects.toThrow(
      "Unsupported cost currency",
    );
    await expect(getCostCurrency()).resolves.toBe(DEFAULT_COST_CURRENCY);
  });
});
