import { countActions, getActionsWithDomains } from "~/server/utils/actions";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  try {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const offset = (page - 1) * limit;

    const filters = {
      status: (query.status as string | undefined) || undefined,
      priority: (query.priority as string | undefined) || undefined,
      domainId: query.domainId ? Number(query.domainId) : undefined,
      archived: ["1", "true", "archived"].includes(
        String(query.archived || "").toLowerCase(),
      ),
      limit,
      offset,
    };

    const [results, total] = await Promise.all([
      getActionsWithDomains(filters),
      countActions(filters),
    ]);

    const items = results.map((r) => ({
      ...r.action,
      domain: r.domain,
      metadata: r.action.metadata ? JSON.parse(r.action.metadata) : null,
    }));

    return success({ items, total, page, limit });
  } catch (e: any) {
    return fail(e.message || "Failed to list actions", 50000);
  }
});
