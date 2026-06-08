import { checkDomain } from "../../../utils/scanner";
import { scanDomainSecurity } from "../../../utils/security-scan";
import { scanDomainSSL } from "../../../utils/ssl";
import { domains } from "../../../db/schema";
import { recordAuditEvent } from "../../../utils/audit";
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
    if (domain.watchKind === "OWNED") {
      scans.push(scanDomainSecurity(domain.id, domain.domain, { notify: true }));
    }
    const results = await Promise.allSettled(scans);
    const failed = results.filter((result) => result.status === "rejected")
      .length;

    await recordAuditEvent({
      event,
      eventType: "domains.refresh",
      outcome: failed > 0 ? "partial_success" : "success",
      actorType: "admin",
      metadata: {
        domainId: domain.id,
        domain: domain.domain,
        checkCount: scans.length,
        failed,
      },
    });

    return success({ refreshed: true });
  } catch (e: any) {
    await recordAuditEvent({
      event,
      eventType: "domains.refresh",
      outcome: "failure",
      actorType: "admin",
      metadata: {
        domainId: Number(getRouterParam(event, "id") || 0) || null,
        reason: e?.message || String(e),
      },
    });
    return fail(e.message || "System Error", 50000);
  }
});
