import { testServerchan } from "~/server/utils/serverchan";

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, "id") || "0");
  if (!id) return fail("Invalid ServerChan id", 40000);

  try {
    return success(await testServerchan(id));
  } catch (error: any) {
    return fail(error.message || "ServerChan test failed", 40000);
  }
});
