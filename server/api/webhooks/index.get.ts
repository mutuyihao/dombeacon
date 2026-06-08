import { webhookConfigs } from "~/server/db/schema";
import { parseProtectedJson } from "~/server/utils/secrets";

const sanitizeWebhook = (webhook: any) => {
  const headers = parseProtectedJson(webhook.headersJson, {});
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    method: webhook.method,
    enabled: Boolean(webhook.enabled),
    eventTypes: parseProtectedJson(webhook.eventTypes, []),
    headerCount: Object.keys(headers).length,
    createdAt: webhook.createdAt,
  };
};

export default defineEventHandler(async (event) => {
  const db = useDb();

  const configs = await db.select().from(webhookConfigs).all();

  return success(configs.map(sanitizeWebhook));
});
