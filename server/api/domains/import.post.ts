import { db } from "../../db";
import { domains } from "../../db/schema";
import { eq } from "drizzle-orm";
import { recordAuditEvent } from "../../utils/audit";
import { isValidDomainName, normalizeDomainInput } from "~/utils/domain";

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; domain: string; error: string }>;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { csvContent } = body;
    const updateExisting = body?.updateExisting !== false;

    if (!csvContent || typeof csvContent !== "string") {
      return fail("CSV content is required", 40000);
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Parse CSV
    const lines = csvContent.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return fail("CSV file is empty or invalid", 40000);
    }

    // Skip header row
    const dataLines = lines.slice(1);

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      let fields: string[] = [];

      try {
        // Parse CSV line (handle quoted fields)
        fields = parseCSVLine(line);

        if (fields.length < 3) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            domain: fields[0] || "unknown",
            error: "Insufficient fields",
          });
          continue;
        }

        const [
          domain,
          watchKind,
          priority,
          , // status (read-only)
          , // expiresAt (read-only)
          , // registrar (read-only)
          groupName,
          tagsStr,
          note,
          isActiveStr,
        ] = fields;
        const normalizedDomain = normalizeDomainInput(domain);

        // Validate domain
        if (!isValidDomainName(normalizedDomain)) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            domain: normalizedDomain || "empty",
            error: "Invalid domain format",
          });
          continue;
        }

        // Validate watchKind
        if (watchKind && !["OWNED", "WANTED"].includes(watchKind)) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            domain: normalizedDomain,
            error: "Invalid watchKind (must be OWNED or WANTED)",
          });
          continue;
        }

        // Validate priority
        if (priority && !["LOW", "MEDIUM", "HIGH"].includes(priority)) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            domain: normalizedDomain,
            error: "Invalid priority (must be LOW, MEDIUM, or HIGH)",
          });
          continue;
        }

        // Parse tags
        const tags = tagsStr
          ? tagsStr.split(";").filter((t) => t.trim())
          : [];

        // Parse isActive
        const isActive =
          isActiveStr === undefined || isActiveStr === ""
            ? true
            : isActiveStr.toLowerCase() === "true";

        // Check if domain already exists
        const existing = await db
          .select()
          .from(domains)
          .where(eq(domains.domain, normalizedDomain))
          .limit(1);

        if (existing.length > 0) {
          if (!updateExisting) {
            result.failed++;
            result.errors.push({
              row: i + 2,
              domain: normalizedDomain,
              error: "Domain already exists",
            });
            continue;
          }

          // Update existing domain
          await db
            .update(domains)
            .set({
              watchKind: watchKind || "WANTED",
              priority: priority || "MEDIUM",
              groupName: groupName || null,
              tagsJson: JSON.stringify(tags),
              note: note || null,
              isActive,
              updatedAt: new Date(),
            })
            .where(eq(domains.domain, normalizedDomain));
        } else {
          // Insert new domain
          await db.insert(domains).values({
            domain: normalizedDomain,
            watchKind: watchKind || "WANTED",
            priority: priority || "MEDIUM",
            groupName: groupName || null,
            tagsJson: JSON.stringify(tags),
            note: note || null,
            isActive,
          });
        }

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 2,
          domain: fields[0] || "unknown",
          error: error.message || "Unknown error",
        });
      }
    }

    await recordAuditEvent({
      event,
      eventType: "domains.import",
      outcome: result.failed > 0 ? "partial_success" : "success",
      actorType: "admin",
      metadata: {
        success: result.success,
        failed: result.failed,
        errorCount: result.errors.length,
        rowCount: dataLines.length,
        updateExisting,
      },
    });

    return success(result);
  } catch (error: any) {
    console.error("Failed to import domains:", error);
    await recordAuditEvent({
      event,
      eventType: "domains.import",
      outcome: "failure",
      actorType: "admin",
      metadata: { reason: error?.message || String(error) },
    });
    return fail(error.message || "Failed to import domains", 50000);
  }
});

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  fields.push(current.trim());

  return fields;
}
