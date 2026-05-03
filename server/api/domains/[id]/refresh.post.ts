import { checkDomain } from "../../../utils/scanner";
import { domains } from "../../../db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    if (!id) return fail("ID required", 40001);

    // Trigger check
    const db = useDb();
    const domain = await db
      .select()
      .from(domains)
      .where(eq(domains.id, Number(id)))
      .get();

    if (!domain) return fail("Domain not found", 40401);

    // Call scanner logic
    await checkDomain(domain.domain, domain.id);

    return success({ refreshed: true });
  } catch (e: any) {
    return fail(e.message || "System Error", 50000);
  }
});
