import { checkDomain } from "../../../utils/scanner";
import { scanDomainSSL } from "../../../utils/ssl";
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

    // Call scanner logic. SSL is useful for every domain, while SSL alerts
    // are still restricted to owned domains in the SSL-specific endpoints.
    const scans: Promise<any>[] = [
      checkDomain(domain.domain, domain.id),
      scanDomainSSL(domain.id, domain.domain),
    ];
    await Promise.allSettled(scans);

    return success({ refreshed: true });
  } catch (e: any) {
    return fail(e.message || "System Error", 50000);
  }
});
