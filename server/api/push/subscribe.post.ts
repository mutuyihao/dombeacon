import { eq } from "drizzle-orm";
import { pushSubscriptions } from "../../db/schema";

/**
 * Register (or re-enable) a Web Push subscription.
 * Body: { endpoint, keys: { p256dh, auth }, userAgent? }
 *
 * Idempotent: if the endpoint already exists, the keys are refreshed and the
 * subscription is re-enabled (the browser will sometimes rotate keys).
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
      return fail("Invalid subscription payload", 40000);
    }

    const db = useDb();
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, body.endpoint))
      .get();

    if (existing) {
      await db
        .update(pushSubscriptions)
        .set({
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          userAgent: body.userAgent || existing.userAgent,
          enabled: true,
        })
        .where(eq(pushSubscriptions.id, existing.id));
      return success({ id: existing.id, refreshed: true });
    }

    const [row] = await db
      .insert(pushSubscriptions)
      .values({
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent || null,
        enabled: true,
      })
      .returning();

    return success({ id: row.id, refreshed: false });
  } catch (e: any) {
    console.error("Push subscribe failed:", e);
    return fail(e.message || "Subscribe failed", 50000);
  }
});
