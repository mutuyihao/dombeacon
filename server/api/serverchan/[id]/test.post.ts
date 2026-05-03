import { testServerchan } from "~/server/utils/serverchan";

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, "id") || "0");

  try {
    const success = await testServerchan(id);

    return {
      success,
      message: success
        ? "Server酱 test successful"
        : "Server酱 test failed - check logs",
    };
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error.message,
    });
  }
});
