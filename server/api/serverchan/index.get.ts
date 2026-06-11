import { serverchanConfigs } from "~/server/db/schema";
import { maskSecretText } from "~/server/utils/secrets";
import { parseServerchanOptions } from "~/server/utils/serverchan";

const parseEventTypes = (value: string | null | undefined) => {
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};

export default defineEventHandler(async (event) => {
  const db = useDb();

  const configs = await db.select().from(serverchanConfigs).all();

  return success(
    configs.map((config) => ({
      id: config.id,
      name: config.name,
      sendKeyMasked: maskSecretText(config.sendKey),
      eventTypes: parseEventTypes(config.eventTypes),
      options: parseServerchanOptions(config.optionsJson),
      enabled: Boolean(config.enabled),
      createdAt: config.createdAt,
    })),
  );
});
