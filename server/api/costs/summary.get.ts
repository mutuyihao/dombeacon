import { db } from "../../db";
import { domainCosts, domains } from "../../db/schema";
import { eq, gte, lte, and } from "drizzle-orm";
import { normalizeCurrency } from "../../utils/currency";
import { getCostCurrency } from "../../utils/settings";

const getMonthKey = (date: Date) =>
  String(date.getMonth() + 1).padStart(2, "0");

const normalizeRegistrar = (registrar: string | null) =>
  registrar?.trim() || null;

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const parsedYear = query.year
      ? Number.parseInt(String(query.year), 10)
      : new Date().getFullYear();
    if (!Number.isFinite(parsedYear) || parsedYear < 1900 || parsedYear > 9999) {
      return fail("Invalid year", 40000);
    }
    const year = parsedYear;

    // Calculate date range for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const costCurrency = await getCostCurrency();

    const costRows = await db
      .select({
        domainId: domainCosts.domainId,
        domain: domains.domain,
        costType: domainCosts.costType,
        amount: domainCosts.amount,
        currency: domainCosts.currency,
        registrar: domainCosts.registrar,
        paymentDate: domainCosts.paymentDate,
      })
      .from(domainCosts)
      .leftJoin(domains, eq(domainCosts.domainId, domains.id))
      .where(
        and(
          gte(domainCosts.paymentDate, startDate),
          lte(domainCosts.paymentDate, endDate),
        ),
      );

    const byTypeMap = new Map<string, { costType: string; total: number; count: number }>();
    const byMonthMap = new Map<string, { month: string; total: number; count: number }>();
    const topDomainsMap = new Map<
      number,
      { domainId: number; domain: string | null; total: number; count: number }
    >();
    const byRegistrarMap = new Map<
      string,
      { registrar: string | null; total: number; count: number }
    >();
    const byCurrencyMap = new Map<
      string,
      { currency: string; total: number; count: number }
    >();

    let total = 0;

    for (const row of costRows) {
      const currency = normalizeCurrency(row.currency);
      const paymentDate =
        row.paymentDate instanceof Date
          ? row.paymentDate
          : new Date(row.paymentDate);
      const month = getMonthKey(paymentDate);
      const registrar = normalizeRegistrar(row.registrar);

      total += row.amount;

      const byType = byTypeMap.get(row.costType) || {
        costType: row.costType,
        total: 0,
        count: 0,
      };
      byType.total += row.amount;
      byType.count += 1;
      byTypeMap.set(row.costType, byType);

      const byMonth = byMonthMap.get(month) || { month, total: 0, count: 0 };
      byMonth.total += row.amount;
      byMonth.count += 1;
      byMonthMap.set(month, byMonth);

      const byDomain = topDomainsMap.get(row.domainId) || {
        domainId: row.domainId,
        domain: row.domain,
        total: 0,
        count: 0,
      };
      byDomain.total += row.amount;
      byDomain.count += 1;
      topDomainsMap.set(row.domainId, byDomain);

      const byRegistrar = byRegistrarMap.get(registrar || "") || {
        registrar,
        total: 0,
        count: 0,
      };
      byRegistrar.total += row.amount;
      byRegistrar.count += 1;
      byRegistrarMap.set(registrar || "", byRegistrar);

      const byCurrency = byCurrencyMap.get(currency) || {
        currency,
        total: 0,
        count: 0,
      };
      byCurrency.total += row.amount;
      byCurrency.count += 1;
      byCurrencyMap.set(currency, byCurrency);
    }

    return success({
      year,
      currency: costCurrency,
      total,
      count: costRows.length,
      byType: Array.from(byTypeMap.values()).sort((a, b) => b.total - a.total),
      byMonth: Array.from(byMonthMap.values()).sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      topDomains: Array.from(topDomainsMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
      byRegistrar: Array.from(byRegistrarMap.values()).sort(
        (a, b) => b.total - a.total,
      ),
      byCurrency: Array.from(byCurrencyMap.values()).sort((a, b) =>
        a.currency.localeCompare(b.currency),
      ),
    });
  } catch (error: any) {
    console.error("Failed to fetch cost summary:", error);
    return fail(error.message || "Failed to fetch cost summary", 50000);
  }
});
