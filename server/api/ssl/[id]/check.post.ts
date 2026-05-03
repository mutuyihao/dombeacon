import { db } from "../../../db";
import { domains } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { scanDomainSSL } from "../../../utils/ssl";

export default defineEventHandler(async (event) => {
  try {
    const id = parseInt(event.context.params?.id || "0");

    if (!id) {
      throw createError({
        statusCode: 400,
        message: "Invalid domain ID",
      });
    }

    // Get domain
    const domain = await db
      .select()
      .from(domains)
      .where(eq(domains.id, id))
      .limit(1);

    if (!domain.length) {
      throw createError({
        statusCode: 404,
        message: "Domain not found",
      });
    }

    // Scan SSL
    const result = await scanDomainSSL(id, domain[0].domain);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("Failed to check SSL:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to check SSL",
    });
  }
});
