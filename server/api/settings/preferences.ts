import { SUPPORTED_COST_CURRENCIES } from "../../utils/currency";
import { recordAuditEvent } from "../../utils/audit";
import { getCostCurrency, setCostCurrency } from "../../utils/settings";

export default defineEventHandler(async (event) => {
  if (event.method === "GET") {
    return success({
      costCurrency: await getCostCurrency(),
      supportedCostCurrencies: SUPPORTED_COST_CURRENCIES,
    });
  }

  if (event.method === "POST") {
    const body = await readBody(event);
    let costCurrency: string;
    try {
      costCurrency = await setCostCurrency(body?.costCurrency);
    } catch (error: any) {
      return fail(error.message || "Invalid preferences", 40000);
    }

    await recordAuditEvent({
      event,
      eventType: "settings.preferences_update",
      outcome: "success",
      actorType: "admin",
      metadata: { costCurrency },
    });

    return success({
      saved: true,
      costCurrency,
      supportedCostCurrencies: SUPPORTED_COST_CURRENCIES,
    });
  }

  return fail("Method not allowed", 40500);
});
