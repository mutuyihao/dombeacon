import { testWebhook } from "~/server/utils/webhook";

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, "id") || "0");
  if (!id) return fail("Invalid webhook id", 40000);

  try {
    const ok = await testWebhook(id);

    return ok
      ? success({ ok: true })
      : success({ ok: false, error: "Webhook test failed - check logs" });
  } catch (error: any) {
    return fail(error.message || "Webhook test failed", 40000);
  }
});
