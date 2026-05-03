import { actions, domains } from "../db/schema";
import { eq, and, or, lt } from "drizzle-orm";

export type ActionType =
  | "WANTED_AVAILABLE"
  | "WANTED_DROPPING"
  | "OWNED_EXPIRING"
  | "SSL_EXPIRING"
  | "SSL_INVALID"
  | "SCAN_FAILED";

export type ActionStatus = "OPEN" | "SNOOZED" | "DISMISSED" | "RESOLVED";

export interface CreateActionParams {
  domainId: number;
  actionType: ActionType;
  priority: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new action with deduplication
 * If an open action of the same type already exists for this domain, return it instead
 */
export async function createAction(params: CreateActionParams) {
  const db = useDb();

  // Check for duplicate open action
  const existing = await db
    .select()
    .from(actions)
    .where(
      and(
        eq(actions.domainId, params.domainId),
        eq(actions.actionType, params.actionType),
        eq(actions.status, "OPEN"),
      ),
    )
    .get();

  if (existing) {
    return existing; // Deduplication
  }

  // Create new action
  const [newAction] = await db
    .insert(actions)
    .values({
      domainId: params.domainId,
      actionType: params.actionType,
      priority: params.priority,
      status: "OPEN",
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    })
    .returning();

  return newAction;
}

/**
 * Update action status (snooze, dismiss, resolve)
 */
export async function updateActionStatus(
  actionId: number,
  status: ActionStatus,
  snoozedUntil?: Date,
) {
  const db = useDb();

  const updateData: any = { status };

  if (status === "SNOOZED" && snoozedUntil) {
    updateData.snoozedUntil = snoozedUntil;
  }

  if (status === "RESOLVED") {
    updateData.resolvedAt = new Date();
  }

  await db.update(actions).set(updateData).where(eq(actions.id, actionId));
}

/**
 * Auto-resolve snoozed actions that have passed their snooze time
 */
export async function autoResolveSnoozedActions() {
  const db = useDb();
  const now = new Date();

  // Find snoozed actions where snoozedUntil has passed
  const expiredSnoozes = await db
    .select()
    .from(actions)
    .where(
      and(eq(actions.status, "SNOOZED"), lt(actions.snoozedUntil, now)),
    )
    .all();

  // Re-open them
  for (const action of expiredSnoozes) {
    await db
      .update(actions)
      .set({ status: "OPEN", snoozedUntil: null })
      .where(eq(actions.id, action.id));
  }

  return expiredSnoozes.length;
}

/**
 * Get actions with domain info joined
 */
export async function getActionsWithDomains(filters?: {
  status?: ActionStatus;
  priority?: string;
  domainId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = useDb();

  let query = db
    .select({
      action: actions,
      domain: domains,
    })
    .from(actions)
    .innerJoin(domains, eq(actions.domainId, domains.id));

  // Apply filters
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(actions.status, filters.status));
  }
  if (filters?.priority) {
    conditions.push(eq(actions.priority, filters.priority));
  }
  if (filters?.domainId) {
    conditions.push(eq(actions.domainId, filters.domainId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Order by priority (HIGH > MEDIUM > LOW) and triggeredAt DESC
  query = query.orderBy(actions.priority, actions.triggeredAt) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as any;
  }

  return await query.all();
}
