import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as schema from "../server/db/schema";
import {
  SECURITY_FINDING_FILTER_SCOPE,
  demoteDefaultSavedFilters,
  serializeSavedFilter,
  withSavedFilterScope,
} from "../server/utils/saved-filters";

const CUSTOM_FILTER_SCOPE = "custom-queue";

describe("saved filter scopes", () => {
  it("stores scope metadata without returning it as criteria", () => {
    const criteria = withSavedFilterScope(
      { status: "OPEN", source: "external" },
      CUSTOM_FILTER_SCOPE,
    );

    expect(criteria).toMatchObject({
      _scope: CUSTOM_FILTER_SCOPE,
      status: "OPEN",
      source: "external",
    });

    const row = serializeSavedFilter({
      id: 1,
      name: "Custom queue",
      criteriaJson: JSON.stringify(criteria),
      isDefault: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    expect(row).toMatchObject({
      id: 1,
      name: "Custom queue",
      scope: CUSTOM_FILTER_SCOPE,
      isDefault: true,
      criteria: {
        status: "OPEN",
        source: "external",
      },
    });
    expect(row.criteria).not.toHaveProperty("_scope");
  });

  it("serializes security findings triage views under their own scope", () => {
    const criteria = withSavedFilterScope(
      {
        status: "OPEN",
        severity: "HIGH",
        findingType: "REGISTRAR_LOCK_MISSING",
      },
      SECURITY_FINDING_FILTER_SCOPE,
    );

    const row = serializeSavedFilter({
      id: 2,
      name: "High registrar lock queue",
      criteriaJson: JSON.stringify(criteria),
      isDefault: false,
      createdAt: new Date("2026-01-02T00:00:00Z"),
    });

    expect(row).toMatchObject({
      id: 2,
      scope: SECURITY_FINDING_FILTER_SCOPE,
      criteria: {
        status: "OPEN",
        severity: "HIGH",
        findingType: "REGISTRAR_LOCK_MISSING",
      },
    });
    expect(row.criteria).not.toHaveProperty("_scope");
  });

  it("demotes defaults only within the current filter scope", async () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE saved_filters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        criteria_json TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER
      );
    `);
    const db = drizzle(sqlite, { schema });

    const domain = await db
      .insert(schema.savedFilters)
      .values({
        name: "Domain default",
        criteriaJson: JSON.stringify(
          withSavedFilterScope({ status: "REGISTERED" }, "domains"),
        ),
        isDefault: true,
      })
      .returning()
      .get();

    const custom = await db
      .insert(schema.savedFilters)
      .values({
        name: "Custom default",
        criteriaJson: JSON.stringify(
          withSavedFilterScope(
            { status: "OPEN" },
            CUSTOM_FILTER_SCOPE,
          ),
        ),
        isDefault: true,
      })
      .returning()
      .get();

    expect(serializeSavedFilter(domain).scope).toBe("domains");

    await demoteDefaultSavedFilters(db, CUSTOM_FILTER_SCOPE);

    const freshDomain = await db
      .select()
      .from(schema.savedFilters)
      .where(eq(schema.savedFilters.id, domain.id))
      .get();
    const freshCustom = await db
      .select()
      .from(schema.savedFilters)
      .where(eq(schema.savedFilters.id, custom.id))
      .get();

    expect(freshDomain?.isDefault).toBe(true);
    expect(freshCustom?.isDefault).toBe(false);

    sqlite.close();
  });
});
