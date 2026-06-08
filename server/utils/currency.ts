export const DEFAULT_COST_CURRENCY = "USD";

export const SUPPORTED_COST_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CNY",
  "JPY",
  "CAD",
  "AUD",
];

export const normalizeCurrency = (currency: unknown) =>
  String(currency || DEFAULT_COST_CURRENCY)
    .trim()
    .toUpperCase();

export const isSupportedCostCurrency = (currency: unknown) => {
  const normalizedCurrency = normalizeCurrency(currency);
  return SUPPORTED_COST_CURRENCIES.includes(normalizedCurrency);
};
