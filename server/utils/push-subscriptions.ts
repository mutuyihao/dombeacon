import { eq, isNull } from "drizzle-orm";
import { pushSubscriptions } from "../db/schema";
import { hashSecretLookupValue, revealSecretText } from "./secrets";
import { useDb } from "./db";

type Db = ReturnType<typeof useDb>;
type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;

export const hashPushEndpoint = (endpoint: string) =>
  hashSecretLookupValue(endpoint);

const endpointMatches = (row: PushSubscriptionRow, endpoint: string) => {
  try {
    return revealSecretText(row.endpoint) === endpoint;
  } catch {
    return false;
  }
};

const backfillEndpointHash = async (
  db: Db,
  row: PushSubscriptionRow,
  endpointHash: string,
) => {
  if (row.endpointHash) return;
  await db
    .update(pushSubscriptions)
    .set({ endpointHash })
    .where(eq(pushSubscriptions.id, row.id));
};

export const findPushSubscriptionByEndpoint = async (
  db: Db,
  endpoint: string,
) => {
  const endpointHash = hashPushEndpoint(endpoint);
  const candidates = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpointHash, endpointHash))
    .all();

  const hashedMatch = candidates.find((row) => endpointMatches(row, endpoint));
  if (hashedMatch) return hashedMatch;

  // Compatibility path for rows created before endpoint_hash existed.
  const legacyRows = await db
    .select()
    .from(pushSubscriptions)
    .where(isNull(pushSubscriptions.endpointHash))
    .all();
  const legacyMatch = legacyRows.find((row) => endpointMatches(row, endpoint));
  if (legacyMatch) {
    await backfillEndpointHash(db, legacyMatch, endpointHash);
    return { ...legacyMatch, endpointHash };
  }

  return null;
};
