import { db } from "../../db";
import { domains, domainStatusLatest } from "../../db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    // Get all active domains with their latest status
    const allDomains = await db
      .select({
        id: domains.id,
        domain: domains.domain,
        watchKind: domains.watchKind,
        priority: domains.priority,
        note: domains.note,
        tagsJson: domains.tagsJson,
        groupName: domains.groupName,
        isActive: domains.isActive,
        createdAt: domains.createdAt,
        status: domainStatusLatest.status,
        expiresAt: domainStatusLatest.expiresAt,
        registrar: domainStatusLatest.registrar,
        checkedAt: domainStatusLatest.checkedAt,
      })
      .from(domains)
      .leftJoin(domainStatusLatest, eq(domains.id, domainStatusLatest.domainId))
      .orderBy(domains.domain);

    // Convert to CSV format
    const csvRows = [];

    // Header row
    csvRows.push([
      "Domain",
      "Watch Kind",
      "Priority",
      "Status",
      "Expires At",
      "Registrar",
      "Group",
      "Tags",
      "Note",
      "Is Active",
      "Created At",
      "Last Checked",
    ].join(","));

    // Data rows
    for (const d of allDomains) {
      const tags = d.tagsJson ? JSON.parse(d.tagsJson).join(";") : "";
      const row = [
        d.domain,
        d.watchKind,
        d.priority,
        d.status || "",
        d.expiresAt ? new Date(d.expiresAt).toISOString() : "",
        d.registrar || "",
        d.groupName || "",
        tags,
        d.note ? `"${d.note.replace(/"/g, '""')}"` : "", // Escape quotes
        d.isActive ? "true" : "false",
        d.createdAt ? new Date(d.createdAt).toISOString() : "",
        d.checkedAt ? new Date(d.checkedAt).toISOString() : "",
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");

    // Set response headers for file download
    setResponseHeaders(event, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="domains-${new Date().toISOString().split('T')[0]}.csv"`,
    });

    return csvContent;
  } catch (error: any) {
    console.error("Failed to export domains:", error);
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to export domains",
    });
  }
});
