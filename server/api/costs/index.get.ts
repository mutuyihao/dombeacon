import { db } from "../../db";
import { domainCosts, domains } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const domainId = query.domainId ? Number.parseInt(String(query.domainId), 10) : null;
    if (query.domainId && (!Number.isFinite(domainId) || domainId <= 0)) {
      return fail("Invalid domainId", 40000);
    }

    let queryBuilder = db
      .select({
        id: domainCosts.id,
        domainId: domainCosts.domainId,
        domain: domains.domain,
        costType: domainCosts.costType,
        amount: domainCosts.amount,
        currency: domainCosts.currency,
        registrar: domainCosts.registrar,
        paymentDate: domainCosts.paymentDate,
        periodStart: domainCosts.periodStart,
        periodEnd: domainCosts.periodEnd,
        note: domainCosts.note,
        createdAt: domainCosts.createdAt,
      })
      .from(domainCosts)
      .leftJoin(domains, eq(domainCosts.domainId, domains.id));

    if (domainId) {
      queryBuilder = queryBuilder.where(eq(domainCosts.domainId, domainId)) as any;
    }

    const costs = await queryBuilder.orderBy(desc(domainCosts.paymentDate));

    return success(costs);
  } catch (error: any) {
    console.error("Failed to fetch costs:", error);
    return fail(error.message || "Failed to fetch costs", 50000);
  }
});
