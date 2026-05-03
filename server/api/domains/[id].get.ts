import {
  domains,
  domainStatusLatest,
  domainStatusHistory,
} from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    const db = useDb();
    const domainId = Number(id);

    const domain = await db
      .select()
      .from(domains)
      .where(eq(domains.id, domainId))
      .get();
    if (!domain) {
      return fail("Domain not found", 40401);
    }

    const latest = await db
      .select()
      .from(domainStatusLatest)
      .where(eq(domainStatusLatest.domainId, domainId))
      .get();

    // History (last 50 items)
    const history = await db
      .select()
      .from(domainStatusHistory)
      .where(eq(domainStatusHistory.domainId, domainId))
      .orderBy(desc(domainStatusHistory.checkedAt))
      .limit(50)
      .all();

    return success({
      domain: {
        ...domain,
        tags: JSON.parse(domain.tagsJson || "[]"),
      },
      latest: latest
        ? {
            ...latest,
            nameservers: JSON.parse(latest.nameserversJson || "[]"),
          }
        : null,
      history,
    });
  } catch (e: any) {
    return fail(e.message || "System Error", 50000);
  }
});
