import { eq, desc, asc, like, and, or } from "drizzle-orm";
import { domains, domainStatusLatest } from "../../db/schema";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const db = useDb();

  try {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const offset = (page - 1) * limit;

    const search = query.search as string;
    const status = query.status as string; // AVAILABLE, REGISTERED, etc.
    const tag = query.tag as string;
    const groupId = query.group as string;
    const watchKind = query.watchKind as string; // OWNED, WANTED
    const priority = query.priority as string; // LOW, MEDIUM, HIGH

    // Build conditions
    const conditions = [];
    if (query.search) {
      conditions.push(
        or(
          like(domains.domain, `%${search}%`),
          like(domains.note, `%${search}%`),
        ),
      );
    }

    // Status filter requires joining or subquery logic if we filter strictly.
    // We will join always.

    if (query.group) {
      conditions.push(eq(domains.groupName, groupId));
    }

    if (query.watchKind) {
      conditions.push(eq(domains.watchKind, watchKind));
    }

    if (query.priority) {
      conditions.push(eq(domains.priority, priority));
    }

    // Tags is JSON, so strict SQL filtering is hard in SQLite without extensions,
    // but we can use LIKE on the stringified JSON or filter in app.
    // For MVP/SQLite, LIKE '%"tag"%' is a hacky but working solution for simple array.
    if (query.tag) {
      conditions.push(like(domains.tagsJson, `%${tag}%`));
    }

    let baseQuery = db
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
        checkedAt: domainStatusLatest.checkedAt,
      })
      .from(domains)
      .leftJoin(
        domainStatusLatest,
        eq(domains.id, domainStatusLatest.domainId),
      );

    if (status && status !== "ALL") {
      // If status is specified, we filter on the joined table
      // Note: Drizzle syntax for where on active query builder
      // We need to construct where clause.
      // Drizzle's db.select().from().where() pattern:
      // We need to combine domain conditions and status condition.
      conditions.push(eq(domainStatusLatest.status, status));
    }

    const resultQuery = baseQuery
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(domains.createdAt)); // Default sort

    const items = await resultQuery.all();

    // Count total for pagination (separate query or just basic count)
    // For simply MVP, maybe skip count or do a separate count query.
    // Let's do a quick count query.
    // const total = await db.select({ count: sql<number>`count(*)` }).from(domains)...

    // Transform items if needed (parse tagsJson)
    const data = items.map((item) => ({
      ...item,
      tags: JSON.parse(item.tagsJson || "[]"),
    }));

    return success({ items, page, limit });
  } catch (e: any) {
    return fail(e.message || "System Error", 50000);
  }
});
