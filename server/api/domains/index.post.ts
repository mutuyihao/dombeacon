import { domains } from "../../db/schema";
import { recordAuditEvent } from "../../utils/audit";
import { checkDomain } from "../../utils/scanner";
import { scanDomainSecurity } from "../../utils/security-scan";
import { scanDomainSSL } from "../../utils/ssl";
import { getBooleanEnv } from "../../utils/env";
import { isValidDomainName, normalizeDomainInput } from "~/utils/domain";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = useDb();

  try {
    if (!body.domain) {
      return fail("Domain is required", 40001);
    }

    const domainName = normalizeDomainInput(body.domain);
    if (
      !isValidDomainName(domainName, {
        allowSingleLabel: getBooleanEnv("ALLOW_SINGLE_LABEL_DOMAINS"),
      })
    ) {
      return fail("Invalid domain format", 40001);
    }
    const watchKind = body.watchKind || "WANTED";

    const result = await db
      .insert(domains)
      .values({
        domain: domainName,
        watchKind,
        priority: body.priority || "MEDIUM",
        note: body.note || "",
        tagsJson: JSON.stringify(body.tags || []),
        groupName: body.group || null,
      })
      .returning()
      .get();

    await recordAuditEvent({
      event,
      eventType: "domains.create",
      outcome: "success",
      actorType: "admin",
      metadata: {
        domainId: result.id,
        domain: result.domain,
        watchKind: result.watchKind,
        priority: result.priority,
        tagsCount: Array.isArray(body.tags) ? body.tags.length : 0,
        groupConfigured: Boolean(body.group),
        noteConfigured: Boolean(body.note),
      },
    });

    // Trigger an immediate scan so the UI isn't "empty" right after adding.
    // Keep failures non-fatal for create.
    try {
      const scans: Promise<any>[] = [checkDomain(domainName, result.id)];
      if (result.watchKind === "OWNED") {
        scans.push(scanDomainSSL(result.id, domainName));
        scans.push(scanDomainSecurity(result.id, domainName, { notify: true }));
      }
      await Promise.allSettled(scans);
    } catch (scanError: any) {
      console.error("Post-create scan failed:", scanError?.message || scanError);
    }

    return success(result);
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      await recordAuditEvent({
        event,
        eventType: "domains.create",
        outcome: "failure",
        actorType: "admin",
        metadata: { reason: "duplicate_domain" },
      });
      return fail("Domain already exists", 40002);
    }
    await recordAuditEvent({
      event,
      eventType: "domains.create",
      outcome: "failure",
      actorType: "admin",
      metadata: { reason: e?.message || String(e) },
    });
    return fail(e.message || "System Error", 50000);
  }
});
