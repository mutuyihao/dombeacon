import { db } from "../../db";
import { domainCosts, domains } from "../../db/schema";
import { eq, sql, gte, lte, and } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const year = query.year ? parseInt(query.year as string) : new Date().getFullYear();

    // Calculate date range for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Get total spent
    const totalResult = await db
      .select({
        total: sql<number>`SUM(${domainCosts.amount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(domainCosts)
      .where(
        and(
          gte(domainCosts.paymentDate, startDate),
          lte(domainCosts.paymentDate, endDate),
        ),
      );

    const total = totalResult[0]?.total || 0;
    const count = totalResult[0]?.count || 0;

    // Get spending by cost type
    const byType = await db
      .select({
        costType: domainCosts.costType,
        total: sql<number>`SUM(${domainCosts.amount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(domainCosts)
      .where(
        and(
          gte(domainCosts.paymentDate, startDate),
          lte(domainCosts.paymentDate, endDate),
        ),
      )
      .groupBy(domainCosts.costType);

    // Get spending by month
    const byMonth = await db
      .select({
        month: sql<string>`strftime('%m', datetime(${domainCosts.paymentDate}/1000, 'unixepoch'))`,
        total: sql<number>`SUM(${domainCosts.amount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(domainCosts)
      .where(
        and(
          gte(domainCosts.paymentDate, startDate),
          lte(domainCosts.paymentDate, endDate),
        ),
      )
      .groupBy(sql`strftime('%m', datetime(${domainCosts.paymentDate}/1000, 'unixepoch'))`);

    // Get top domains by cost
    const topDomains = await db
      .select({
        domainId: domainCosts.domainId,
        domain: domains.domain,
        total: sql<number>`SUM(${domainCosts.amount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(domainCosts)
      .leftJoin(domains, eq(domainCosts.domainId, domains.id))
      .where(
        and(
          gte(domainCosts.paymentDate, startDate),
          lte(domainCosts.paymentDate, endDate),
        ),
      )
      .groupBy(domainCosts.domainId, domains.domain)
      .orderBy(sql`SUM(${domainCosts.amount}) DESC`)
      .limit(10);

    // Get spending by registrar
    const byRegistrar = await db
      .select({
        registrar: domainCosts.registrar,
        total: sql<number>`SUM(${domainCosts.amount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(domainCosts)
      .where(
        and(
          gte(domainCosts.paymentDate, startDate),
          lte(domainCosts.paymentDate, endDate),
        ),
      )
      .groupBy(domainCosts.registrar);

    return success({
        year,
        total,
        count,
        byType,
        byMonth,
        topDomains,
        byRegistrar,
    });
  } catch (error: any) {
    console.error("Failed to fetch cost summary:", error);
    return fail(error.message || "Failed to fetch cost summary", 50000);
  }
});
