import { testWebhook } from "~/server/utils/webhook";

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, "id") || "0");

  try {
    const success = await testWebhook(id);

    return {
      success,
      message: success
        ? "Webhook test successful"
        : "Webhook test failed - check logs",
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message,
    });
  }
});
