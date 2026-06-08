import { recordAuditEvent } from "../../../utils/audit";
import { checkDomainSSLById } from "../../../utils/ssl-check";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isFinite(id) || id <= 0) {
    return fail("Invalid domain ID", 40000);
  }

  try {
    const result = await checkDomainSSLById(id);
    await recordAuditEvent({
      event,
      eventType: "ssl.check_one",
      outcome: result.error || result.validationError ? "partial_success" : "success",
      actorType: "admin",
      metadata: {
        domainId: id,
        hasSSL: Boolean(result.hasSSL),
        isValid: Boolean(result.isValid),
        hasError: Boolean(result.error || result.validationError),
      },
    });
    return success(result);
  } catch (error: any) {
    console.error("Failed to check SSL:", error);
    await recordAuditEvent({
      event,
      eventType: "ssl.check_one",
      outcome: "failure",
      actorType: "admin",
      metadata: { domainId: id, reason: error?.message || String(error) },
    });
    return fail(error.message || "Failed to check SSL", 50000);
  }
});
