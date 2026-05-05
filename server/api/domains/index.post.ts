import { domains } from "../../db/schema";
import { checkDomain } from "../../utils/scanner";
import { scanDomainSSL } from "../../utils/ssl";
import { isValidDomainName, normalizeDomainInput } from "~/utils/domain";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = useDb();

  try {
    if (!body.domain) {
      return fail("Domain is required", 40001);
    }

    const domainName = normalizeDomainInput(body.domain);
    if (!isValidDomainName(domainName)) {
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

    // Trigger an immediate scan so the UI isn't "empty" right after adding.
    // Keep failures non-fatal for create.
    try {
      const scans: Promise<any>[] = [
        checkDomain(domainName, result.id),
        scanDomainSSL(result.id, domainName),
      ];
      await Promise.allSettled(scans);
    } catch (scanError: any) {
      console.error("Post-create scan failed:", scanError?.message || scanError);
    }

    return success(result);
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return fail("Domain already exists", 40002);
    }
    return fail(e.message || "System Error", 50000);
  }
});
