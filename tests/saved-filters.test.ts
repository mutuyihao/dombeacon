import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as schema from "../server/db/schema";
import {
  BRAND_WATCH_RISK_FILTER_SCOPE,
  DEFAULT_FILTER_SCOPE,
  SECURITY_FINDING_FILTER_SCOPE,
  demoteDefaultSavedFilters,
  serializeSavedFilter,
  withSavedFilterScope,
} from "../server/utils/saved-filters";

describe("saved filter scopes", () => {
  it("stores scope metadata without returning it as criteria", () => {
    const criteria = withSavedFilterScope(
      { reviewStatus: "OPEN", source: "ct" },
      BRAND_WATCH_RISK_FILTER_SCOPE,
    );

    expect(criteria).toMatchObject({
      _scope: BRAND_WATCH_RISK_FILTER_SCOPE,
      reviewStatus: "OPEN",
      source: "ct",
    });

    const row = serializeSavedFilter({
      id: 1,
      name: "CT queue",
      criteriaJson: JSON.stringify(criteria),
      isDefault: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    expect(row).toMatchObject({
      id: 1,
      name: "CT queue",
      scope: BRAND_WATCH_RISK_FILTER_SCOPE,
      isDefault: true,
      criteria: {
        reviewStatus: "OPEN",
        source: "ct",
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

  it("treats legacy filters as domain-scoped and demotes defaults by scope", async () => {
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
        name: "Legacy domain default",
        criteriaJson: JSON.stringify({ status: "REGISTERED" }),
        isDefault: true,
      })
      .returning()
      .get();

    const brand = await db
      .insert(schema.savedFilters)
      .values({
        name: "Brand default",
        criteriaJson: JSON.stringify(
          withSavedFilterScope(
            { reviewStatus: "OPEN" },
            BRAND_WATCH_RISK_FILTER_SCOPE,
          ),
        ),
        isDefault: true,
      })
      .returning()
      .get();

    expect(serializeSavedFilter(domain).scope).toBe(DEFAULT_FILTER_SCOPE);

    await demoteDefaultSavedFilters(db, BRAND_WATCH_RISK_FILTER_SCOPE);

    const freshDomain = await db
      .select()
      .from(schema.savedFilters)
      .where(eq(schema.savedFilters.id, domain.id))
      .get();
    const freshBrand = await db
      .select()
      .from(schema.savedFilters)
      .where(eq(schema.savedFilters.id, brand.id))
      .get();

    expect(freshDomain?.isDefault).toBe(true);
    expect(freshBrand?.isDefault).toBe(false);

    sqlite.close();
  });
});
