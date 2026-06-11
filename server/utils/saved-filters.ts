import { eq } from "drizzle-orm";
import { savedFilters } from "../db/schema";

export const DEFAULT_FILTER_SCOPE = "domains";
export const SECURITY_FINDING_FILTER_SCOPE = "security-findings";

const META_SCOPE_KEY = "_scope";

export const parseSavedFilterCriteria = (value: string | null | undefined) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

export const normalizeSavedFilterScope = (value: unknown) => {
  const scope = String(value || "").trim().toLowerCase();
  if (!scope) return DEFAULT_FILTER_SCOPE;
  return /^[a-z0-9_-]{1,50}$/.test(scope) ? scope : DEFAULT_FILTER_SCOPE;
};

export const getSavedFilterScope = (criteria: Record<string, any>) =>
  normalizeSavedFilterScope(criteria[META_SCOPE_KEY]);

export const stripSavedFilterScope = (criteria: Record<string, any>) => {
  const { [META_SCOPE_KEY]: _scope, scope, ...rest } = criteria;
  return rest;
};

export const withSavedFilterScope = (
  criteria: Record<string, any>,
  scope: string,
) => ({
  ...stripSavedFilterScope(criteria || {}),
  [META_SCOPE_KEY]: normalizeSavedFilterScope(scope),
});

export const serializeSavedFilter = (row: typeof savedFilters.$inferSelect) => {
  const criteria = parseSavedFilterCriteria(row.criteriaJson);
  const scope = getSavedFilterScope(criteria);
  return {
    id: row.id,
    name: row.name,
    scope,
    isDefault: !!row.isDefault,
    createdAt: row.createdAt,
    criteria: stripSavedFilterScope(criteria),
  };
};

export const demoteDefaultSavedFilters = async (
  db: any,
  scope: string,
  exceptId?: number,
) => {
  const targetScope = normalizeSavedFilterScope(scope);
  const rows = await db
    .select()
    .from(savedFilters)
    .where(eq(savedFilters.isDefault, true))
    .all();

  for (const row of rows) {
    if (exceptId && row.id === exceptId) continue;
    const rowScope = getSavedFilterScope(parseSavedFilterCriteria(row.criteriaJson));
    if (rowScope !== targetScope) continue;
    await db
      .update(savedFilters)
      .set({ isDefault: false })
      .where(eq(savedFilters.id, row.id));
  }
};
