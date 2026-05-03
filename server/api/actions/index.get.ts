import { getActionsWithDomains } from "~/server/utils/actions";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const filters = {
    status: query.status as string | undefined,
    priority: query.priority as string | undefined,
    domainId: query.domainId ? Number(query.domainId) : undefined,
    limit: query.limit ? Number(query.limit) : 50,
    offset: query.offset ? Number(query.offset) : 0,
  };

  const results = await getActionsWithDomains(filters);

  return {
    actions: results.map((r) => ({
      ...r.action,
      domain: r.domain,
      metadata: r.action.metadata ? JSON.parse(r.action.metadata) : null,
    })),
    total: results.length,
  };
});
