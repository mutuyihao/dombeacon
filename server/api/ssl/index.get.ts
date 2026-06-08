import { db } from "../../db";
import { sslStatusLatest, domains } from "../../db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    // List every active domain so the SSL page can show "not checked" rows.
    const sslStatuses = await db
      .select({
        domainId: domains.id,
        domain: domains.domain,
        watchKind: domains.watchKind,
        priority: domains.priority,
        checkedHost: sslStatusLatest.checkedHost,
        hasSSL: sslStatusLatest.hasSSL,
        isValid: sslStatusLatest.isValid,
        issuer: sslStatusLatest.issuer,
        validFrom: sslStatusLatest.validFrom,
        validTo: sslStatusLatest.validTo,
        daysUntilExpiry: sslStatusLatest.daysUntilExpiry,
        checkedAt: sslStatusLatest.checkedAt,
        validationError: sslStatusLatest.validationError,
        lastError: sslStatusLatest.lastError,
        lastErrorAt: sslStatusLatest.lastErrorAt,
      })
      .from(domains)
      .leftJoin(sslStatusLatest, eq(sslStatusLatest.domainId, domains.id))
      .where(eq(domains.isActive, true));

    return success(sslStatuses);
  } catch (error: any) {
    console.error("Failed to fetch SSL statuses:", error);
    return fail(error.message || "Failed to fetch SSL statuses", 50000);
  }
});
