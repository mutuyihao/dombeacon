import { checkDomainSSLById } from "../../../utils/ssl-check";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    return fail("Invalid domain ID", 40000);
  }

  try {
    const result = await checkDomainSSLById(id);
    return success(result);
  } catch (error: any) {
    console.error("Failed to check SSL:", error);
    return fail(error.message || "Failed to check SSL", 50000);
  }
});
