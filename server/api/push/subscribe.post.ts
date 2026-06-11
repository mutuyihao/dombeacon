import { eq } from "drizzle-orm";
import { pushSubscriptions } from "../../db/schema";
import { recordAuditEvent } from "../../utils/audit";
import { isPushConfigured } from "../../utils/push";
import { protectSecretText } from "../../utils/secrets";
import {
  findPushSubscriptionByEndpoint,
  hashPushEndpoint,
} from "../../utils/push-subscriptions";

/**
 * Register (or re-enable) a Web Push subscription.
 * Body: { endpoint, keys: { p256dh, auth }, userAgent? }
 *
 * Idempotent: if the endpoint already exists, the keys are refreshed and the
 * subscription is re-enabled (the browser will sometimes rotate keys).
 */
export default defineEventHandler(async (event) => {
  try {
    if (!isPushConfigured()) {
      return fail("Web Push is not configured", 40900);
    }

    const body = await readBody(event);
    if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
      return fail("Invalid subscription payload", 40000);
    }

    const endpoint = String(body.endpoint).trim();
    if (!endpoint) {
      return fail("Invalid subscription endpoint", 40000);
    }
    let endpointUrl: URL;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      return fail("Invalid subscription endpoint", 40000);
    }
    if (endpointUrl.protocol !== "https:") {
      return fail("Invalid subscription endpoint", 40000);
    }

    const db = useDb();
    const endpointHash = hashPushEndpoint(endpoint);
    const existing = await findPushSubscriptionByEndpoint(db, endpoint);

    if (existing) {
      await db
        .update(pushSubscriptions)
        .set({
          endpoint: protectSecretText(endpoint),
          endpointHash,
          p256dh: protectSecretText(body.keys.p256dh),
          auth: protectSecretText(body.keys.auth),
          userAgent: body.userAgent || existing.userAgent,
          enabled: true,
        })
        .where(eq(pushSubscriptions.id, existing.id));
      await recordAuditEvent({
        event,
        eventType: "push.subscribe",
        outcome: "success",
        actorType: "admin",
        metadata: {
          id: existing.id,
          refreshed: true,
          userAgentConfigured: Boolean(body.userAgent || existing.userAgent),
        },
      });
      return success({ id: existing.id, refreshed: true });
    }

    const [row] = await db
      .insert(pushSubscriptions)
      .values({
        endpoint: protectSecretText(endpoint),
        endpointHash,
        p256dh: protectSecretText(body.keys.p256dh),
        auth: protectSecretText(body.keys.auth),
        userAgent: body.userAgent || null,
        enabled: true,
      })
      .returning();

    await recordAuditEvent({
      event,
      eventType: "push.subscribe",
      outcome: "success",
      actorType: "admin",
      metadata: {
        id: row.id,
        refreshed: false,
        userAgentConfigured: Boolean(body.userAgent),
      },
    });

    return success({ id: row.id, refreshed: false });
  } catch (e: any) {
    console.error("Push subscribe failed:", e);
    await recordAuditEvent({
      event,
      eventType: "push.subscribe",
      outcome: "failure",
      actorType: "admin",
      metadata: { reason: e?.message || String(e) },
    });
    return fail(e.message || "Subscribe failed", 50000);
  }
});
