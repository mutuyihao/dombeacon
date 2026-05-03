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
      throw createError({
        statusCode: 400,
        message: "Missing required fields: domainId, costType, amount, paymentDate",
      });
    }

    // Validate cost type
    const validCostTypes = ["REGISTRATION", "RENEWAL", "TRANSFER", "PRIVACY", "OTHER"];
    if (!validCostTypes.includes(costType)) {
      throw createError({
        statusCode: 400,
        message: "Invalid costType",
      });
    }

    // Validate amount (in cents)
    if (typeof amount !== "number" || amount < 0) {
      throw createError({
        statusCode: 400,
        message: "Amount must be a non-negative number (in cents)",
      });
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

    return {
      success: true,
      data: newCost,
    };
  } catch (error: any) {
    console.error("Failed to create cost:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to create cost",
    });
  }
});
