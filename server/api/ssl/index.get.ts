import { db } from "../../db";
import { sslStatusLatest, domains } from "../../db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    // Get all SSL statuses with domain info
    const sslStatuses = await db
      .select({
        domainId: sslStatusLatest.domainId,
        domain: domains.domain,
        watchKind: domains.watchKind,
        priority: domains.priority,
        hasSSL: sslStatusLatest.hasSSL,
        isValid: sslStatusLatest.isValid,
        issuer: sslStatusLatest.issuer,
        validFrom: sslStatusLatest.validFrom,
        validTo: sslStatusLatest.validTo,
        daysUntilExpiry: sslStatusLatest.daysUntilExpiry,
        checkedAt: sslStatusLatest.checkedAt,
        lastError: sslStatusLatest.lastError,
        lastErrorAt: sslStatusLatest.lastErrorAt,
      })
      .from(sslStatusLatest)
      .leftJoin(domains, eq(sslStatusLatest.domainId, domains.id))
      .where(eq(domains.isActive, true));

    return {
      success: true,
      data: sslStatuses,
    };
  } catch (error: any) {
    console.error("Failed to fetch SSL statuses:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to fetch SSL statuses",
    });
  }
});
