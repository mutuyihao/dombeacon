import { eq } from "drizzle-orm";
import { pushSubscriptions } from "../../db/schema";
import { recordAuditEvent } from "../../utils/audit";
import { findPushSubscriptionByEndpoint } from "../../utils/push-subscriptions";

/**
 * Unsubscribe a Web Push endpoint.
 * Body: { endpoint }
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    if (!body?.endpoint) {
      return fail("Endpoint required", 40000);
    }

    const endpoint = String(body.endpoint).trim();
    if (!endpoint) {
      return fail("Endpoint required", 40000);
    }
    try {
      const endpointUrl = new URL(endpoint);
      if (endpointUrl.protocol !== "https:") {
        return fail("Endpoint required", 40000);
      }
    } catch {
      return fail("Endpoint required", 40000);
    }

    const db = useDb();
    const match = await findPushSubscriptionByEndpoint(db, endpoint);

    const result = match
      ? await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, match.id))
      : null;

    await recordAuditEvent({
      event,
      eventType: "push.unsubscribe",
      outcome: "success",
      actorType: "admin",
      metadata: {
        id: match?.id || null,
        matched: Boolean(match),
      },
    });

    return success({ deleted: true, result });
  } catch (e: any) {
    console.error("Push unsubscribe failed:", e);
    await recordAuditEvent({
      event,
      eventType: "push.unsubscribe",
      outcome: "failure",
      actorType: "admin",
      metadata: { reason: e?.message || String(e) },
    });
    return fail(e.message || "Unsubscribe failed", 50000);
  }
});
