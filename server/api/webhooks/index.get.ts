import { webhookConfigs } from "~/server/db/schema";

const parseJson = (value: string | null | undefined, fallback: any) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const sanitizeWebhook = (webhook: any) => {
  const headers = parseJson(webhook.headersJson, {});
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    method: webhook.method,
    enabled: Boolean(webhook.enabled),
    eventTypes: parseJson(webhook.eventTypes, []),
    headerCount: Object.keys(headers).length,
    createdAt: webhook.createdAt,
  };
};

export default defineEventHandler(async (event) => {
  const db = useDb();

  const configs = await db.select().from(webhookConfigs).all();

  return success(configs.map(sanitizeWebhook));
});
