import { db } from "../../db";
import { domainCosts } from "../../db/schema";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const {
      domainId,
      costType,
      amount,
      currency,
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

    // Validate cost type
    const validCostTypes = ["REGISTRATION", "RENEWAL", "TRANSFER", "PRIVACY", "OTHER"];
    if (!validCostTypes.includes(costType)) {
      return fail("Invalid costType", 40000);
    }

    // Validate amount (in cents)
    if (typeof amount !== "number" || amount < 0) {
      return fail("Amount must be a non-negative number (in cents)", 40000);
    }

    // Insert cost record
    const [newCost] = await db
      .insert(domainCosts)
      .values({
        domainId: parseInt(domainId),
        costType,
        amount: Math.round(amount), // Ensure integer (cents)
        currency: currency || "USD",
        registrar: registrar || null,
        paymentDate: new Date(paymentDate),
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        note: note || null,
      })
      .returning();

    return success(newCost);
  } catch (error: any) {
    console.error("Failed to create cost:", error);
    return fail(error.message || "Failed to create cost", 50000);
  }
});
