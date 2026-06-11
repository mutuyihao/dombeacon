import { and, eq } from "drizzle-orm";
import { domains } from "../../db/schema";
import { recordAuditEvent } from "../../utils/audit";
import { checkDomainSSLById } from "../../utils/ssl-check";

const CONCURRENCY = 3;

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export default defineEventHandler(async (event) => {
  const db = useDb();
  try {
    const query = getQuery(event);
    const includeWanted =
      String(query.includeWanted || "").trim().toLowerCase() === "true";
    const activeDomains = await db
      .select({ id: domains.id, domain: domains.domain })
      .from(domains)
      .where(
        includeWanted
          ? eq(domains.isActive, true)
          : and(eq(domains.isActive, true), eq(domains.watchKind, "OWNED")),
      )
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
          if (result.value.error || result.value.validationError) {
            failed += 1;
            errors.push({
              domainId: domain.id,
              domain: domain.domain,
              error: result.value.error || result.value.validationError,
            });
          }
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

    await recordAuditEvent({
      event,
      eventType: "ssl.check_all",
      outcome: failed > 0 ? "partial_success" : "success",
      actorType: "admin",
      metadata: {
        activeDomainCount: activeDomains.length,
        includeWanted,
        checked,
        failed,
        errorCount: errors.length,
      },
    });

    return success({ checked, failed, errors });
  } catch (error: any) {
    await recordAuditEvent({
      event,
      eventType: "ssl.check_all",
      outcome: "failure",
      actorType: "admin",
      metadata: { reason: error?.message || String(error) },
    });
    return fail(error.message || "Failed to refresh SSL statuses", 50000);
  }
});
