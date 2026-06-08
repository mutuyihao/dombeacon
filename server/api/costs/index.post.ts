import { db } from "../../db";
import { domainCosts } from "../../db/schema";
import { getCostCurrency } from "../../utils/settings";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const {
      domainId,
      costType,
      amount,
      registrar,
      paymentDate,
      periodStart,
      periodEnd,
      note,
    } = body;

    // Validate required fields
    if (!domainId || !costType || amount === undefined || !paymentDate) {
      return fail(
        "Missing required fields: domainId, costType, amount, paymentDate",
        40000,
      );
    }

    const parsedDomainId = Number.parseInt(String(domainId), 10);
    if (!Number.isFinite(parsedDomainId) || parsedDomainId <= 0) {
      return fail("Invalid domainId", 40000);
    }

    // Validate cost type
    const validCostTypes = ["REGISTRATION", "RENEWAL", "TRANSFER", "PRIVACY", "OTHER"];
    if (!validCostTypes.includes(costType)) {
      return fail("Invalid costType", 40000);
    }

    // Validate amount (in cents)
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return fail("Amount must be a non-negative number (in cents)", 40000);
    }

    const parsedPaymentDate = new Date(paymentDate);
    const parsedPeriodStart = periodStart ? new Date(periodStart) : null;
    const parsedPeriodEnd = periodEnd ? new Date(periodEnd) : null;

    if (Number.isNaN(parsedPaymentDate.getTime())) {
      return fail("Invalid paymentDate", 40000);
    }
    if (parsedPeriodStart && Number.isNaN(parsedPeriodStart.getTime())) {
      return fail("Invalid periodStart", 40000);
    }
    if (parsedPeriodEnd && Number.isNaN(parsedPeriodEnd.getTime())) {
      return fail("Invalid periodEnd", 40000);
    }

    const costCurrency = await getCostCurrency();

    // Insert cost record
    const [newCost] = await db
      .insert(domainCosts)
      .values({
        domainId: parsedDomainId,
        costType,
        amount: Math.round(amount), // Ensure integer (cents)
        currency: costCurrency,
        registrar: registrar || null,
        paymentDate: parsedPaymentDate,
        periodStart: parsedPeriodStart,
        periodEnd: parsedPeriodEnd,
        note: note || null,
      })
      .returning();

    return success(newCost);
  } catch (error: any) {
    console.error("Failed to create cost:", error);
    return fail(error.message || "Failed to create cost", 50000);
  }
});
