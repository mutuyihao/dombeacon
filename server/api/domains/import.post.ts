import { db } from "../../db";
import { domains } from "../../db/schema";
import { eq } from "drizzle-orm";

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; domain: string; error: string }>;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { csvContent } = body;

    if (!csvContent || typeof csvContent !== "string") {
      throw createError({
        statusCode: 400,
        message: "CSV content is required",
      });
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Parse CSV
    const lines = csvContent.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      throw createError({
        statusCode: 400,
        message: "CSV file is empty or invalid",
      });
    }

    // Skip header row
    const dataLines = lines.slice(1);

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      try {
        // Parse CSV line (handle quoted fields)
        const fields = parseCSVLine(line);

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

        // Validate domain
        if (!domain || !domain.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            domain: domain || "empty",
            error: "Invalid domain format",
          });
          continue;
        }

        // Validate watchKind
        if (watchKind && !["OWNED", "WANTED"].includes(watchKind)) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            domain,
            error: "Invalid watchKind (must be OWNED or WANTED)",
          });
          continue;
        }

        // Validate priority
        if (priority && !["LOW", "MEDIUM", "HIGH"].includes(priority)) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            domain,
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
          .where(eq(domains.domain, domain))
          .limit(1);

        if (existing.length > 0) {
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
            .where(eq(domains.domain, domain));
        } else {
          // Insert new domain
          await db.insert(domains).values({
            domain,
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

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("Failed to import domains:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Failed to import domains",
    });
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
