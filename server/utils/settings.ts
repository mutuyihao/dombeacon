import { eq } from "drizzle-orm";
import { db } from "../db";
import { appSettings } from "../db/schema";
import {
  DEFAULT_COST_CURRENCY,
  isSupportedCostCurrency,
  normalizeCurrency,
} from "./currency";

const COST_CURRENCY_KEY = "cost.currency";

const getSetting = async (key: string) => {
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1)
    .get();

  return row?.value || null;
};

const setSetting = async (key: string, value: string) => {
  const existing = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1)
    .get();

  const values = {
    value,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(appSettings).set(values).where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({
      key,
      ...values,
    });
  }
};

export const getCostCurrency = async () => {
  const value = normalizeCurrency(await getSetting(COST_CURRENCY_KEY));
  return isSupportedCostCurrency(value) ? value : DEFAULT_COST_CURRENCY;
};

export const setCostCurrency = async (currency: unknown) => {
  const value = normalizeCurrency(currency);
  if (!isSupportedCostCurrency(value)) {
    throw new Error("Unsupported cost currency");
  }

  await setSetting(COST_CURRENCY_KEY, value);
  return value;
};
