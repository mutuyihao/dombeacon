import { inArray } from "drizzle-orm";
import { riskFindings } from "../db/schema";

export const RISK_FINDING_STATUSES = [
  "OPEN",
  "SNOOZED",
  "DISMISSED",
  "RESOLVED",
] as const;

export type RiskFindingStatus = (typeof RISK_FINDING_STATUSES)[number];

type FindingIdValidation = {
  ids: number[];
  error: string | null;
};

type RiskFindingStatusValidation =
  | {
      error: string;
      status?: never;
      snoozedUntil?: never;
    }
  | {
      error: null;
      status: RiskFindingStatus;
      snoozedUntil: Date | null;
    };

const allowedStatuses = new Set<RiskFindingStatus>(RISK_FINDING_STATUSES);

export const normalizeFindingIds = (
  value: unknown,
  max = 200,
): FindingIdValidation => {
  const input = Array.isArray(value) ? value : [];
  const ids = [
    ...new Set(
      input
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  ];

  if (ids.length === 0) {
    return { ids, error: "At least one valid finding id is required" };
  }
  if (ids.length > max) {
    return { ids, error: `At most ${max} finding ids can be updated at once` };
  }

  return { ids, error: null };
};

export const validateRiskFindingStatusUpdate = (input: {
  status?: unknown;
  snoozedUntil?: unknown;
}): RiskFindingStatusValidation => {
  const status = String(input.status || "") as RiskFindingStatus;
  const snoozedUntilRaw = input.snoozedUntil
    ? String(input.snoozedUntil)
    : "";

  if (!allowedStatuses.has(status)) {
    return {
      error: "Invalid status. Must be OPEN, SNOOZED, DISMISSED, or RESOLVED",
    };
  }

  if (status === "SNOOZED" && !snoozedUntilRaw) {
    return {
      error: "snoozedUntil is required when status is SNOOZED",
    };
  }

  const snoozedUntil = snoozedUntilRaw ? new Date(snoozedUntilRaw) : null;
  if (snoozedUntil && Number.isNaN(snoozedUntil.getTime())) {
    return { error: "Invalid snoozedUntil" };
  }

  return { status, snoozedUntil, error: null };
};

export const buildRiskFindingStatusUpdate = (
  status: RiskFindingStatus,
  snoozedUntil: Date | null,
  now = new Date(),
) => ({
  status,
  snoozedUntil: status === "SNOOZED" ? snoozedUntil : null,
  resolvedAt: status === "RESOLVED" ? now : null,
});

export const bulkUpdateRiskFindingStatus = async (params: {
  db: ReturnType<typeof useDb>;
  ids: number[];
  status: RiskFindingStatus;
  snoozedUntil: Date | null;
  now?: Date;
}) => {
  const updateData = buildRiskFindingStatusUpdate(
    params.status,
    params.snoozedUntil,
    params.now,
  );

  return await params.db
    .update(riskFindings)
    .set(updateData)
    .where(inArray(riskFindings.id, params.ids))
    .returning();
};
