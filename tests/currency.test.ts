import { describe, expect, it } from "vitest";
import {
  DEFAULT_COST_CURRENCY,
  SUPPORTED_COST_CURRENCIES,
  isSupportedCostCurrency,
  normalizeCurrency,
} from "../server/utils/currency";

describe("cost currency helpers", () => {
  it("normalizes and validates supported cost currencies without exchange rates", () => {
    expect(DEFAULT_COST_CURRENCY).toBe("USD");
    expect(SUPPORTED_COST_CURRENCIES).toContain("CNY");
    expect(normalizeCurrency(" cny ")).toBe("CNY");
    expect(isSupportedCostCurrency("cny")).toBe(true);
    expect(isSupportedCostCurrency("btc")).toBe(false);
  });
});
