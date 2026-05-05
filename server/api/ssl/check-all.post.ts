import { eq } from "drizzle-orm";
import { domains } from "../../db/schema";
import { checkDomainSSLById } from "../../utils/ssl-check";

const CONCURRENCY = 3;

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export default defineEventHandler(async () => {
  const db = useDb();
  try {
    const activeDomains = await db
      .select({ id: domains.id, domain: domains.domain })
      .from(domains)
      .where(eq(domains.isActive, true))
      .all();

    const errors: Array<{ domainId: number; domain: string; error: string }> =
      [];
    let checked = 0;
    let failed = 0;

    for (const batch of chunk(activeDomains, CONCURRENCY)) {
      const results = await Promise.allSettled(
        batch.map((domain) => checkDomainSSLById(domain.id)),
      );

      results.forEach((result, index) => {
        const domain = batch[index];
        if (result.status === "fulfilled") {
          checked += 1;
        } else {
          failed += 1;
          errors.push({
            domainId: domain.id,
            domain: domain.domain,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
        }
      });
    }

    return success({ checked, failed, errors });
  } catch (error: any) {
    return fail(error.message || "Failed to refresh SSL statuses", 50000);
  }
});
