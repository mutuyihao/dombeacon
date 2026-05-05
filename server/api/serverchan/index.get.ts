import { serverchanConfigs } from "~/server/db/schema";

const parseEventTypes = (value: string | null | undefined) => {
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};

const maskSendKey = (sendKey: string | null | undefined) => {
  if (!sendKey || sendKey.length < 8) return "****";
  return `${sendKey.slice(0, 4)}****${sendKey.slice(-4)}`;
};

export default defineEventHandler(async (event) => {
  const db = useDb();

  const configs = await db.select().from(serverchanConfigs).all();

  return success(
    configs.map((config) => ({
      id: config.id,
      name: config.name,
      sendKeyMasked: maskSendKey(config.sendKey),
      eventTypes: parseEventTypes(config.eventTypes),
      enabled: Boolean(config.enabled),
      createdAt: config.createdAt,
    })),
  );
});
