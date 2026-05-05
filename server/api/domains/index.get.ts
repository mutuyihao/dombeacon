import { eq, desc, like, and, or, sql, lt, gt, isNull } from "drizzle-orm";
import {
  domains,
  domainStatusLatest,
  sslStatusLatest,
} from "../../db/schema";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const db = useDb();

  try {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const offset = (page - 1) * limit;

    const search = query.search as string;
    const status = query.status as string; // AVAILABLE, REGISTERED, etc.
    const tag = query.tag as string;
    const tags = query.tags as string; // comma-separated
    const groupId = query.group as string;
    const watchKind = query.watchKind as string; // OWNED, WANTED
    const priority = query.priority as string; // LOW, MEDIUM, HIGH
    const sslState = query.sslState as string; // expiring | invalid | none
    const expiringDays = query.expiringDays
      ? Number(query.expiringDays)
      : null;

    // Build conditions
    const conditions: any[] = [];
    if (search) {
      conditions.push(
        or(
          like(domains.domain, `%${search}%`),
          like(domains.note, `%${search}%`),
        ),
      );
    }

    if (groupId) {
      conditions.push(eq(domains.groupName, groupId));
    }

    if (watchKind) {
      conditions.push(eq(domains.watchKind, watchKind));
    }

    if (priority) {
      conditions.push(eq(domains.priority, priority));
    }

    const tagContains = (value: string) =>
      sql`exists (
        select 1
        from json_each(coalesce(${domains.tagsJson}, '[]'))
        where json_each.value = ${value}
      )`;

    // Tags: support both legacy single `tag` and new multi `tags` (comma-separated, AND-match).
    // Match exact JSON array elements instead of fuzzy substrings.
    const singleTag = tag?.trim();
    if (singleTag) {
      conditions.push(tagContains(singleTag));
    }
    if (tags) {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      for (const t of tagList) {
        conditions.push(tagContains(t));
      }
    }

    if (status && status !== "ALL") {
      conditions.push(eq(domainStatusLatest.status, status));
    }

    // expiringDays: domains whose expiresAt is within N days from now
    if (expiringDays != null && !isNaN(expiringDays)) {
      const cutoff = new Date(Date.now() + expiringDays * 24 * 60 * 60 * 1000);
      conditions.push(lt(domainStatusLatest.expiresAt, cutoff));
      conditions.push(gt(domainStatusLatest.expiresAt, new Date()));
    }

    // SSL state filtering
    const needSslJoin = !!sslState;
    if (sslState === "expiring") {
      // hasSSL=true & 0 < daysUntilExpiry < 30
      conditions.push(eq(sslStatusLatest.hasSSL, true));
      conditions.push(lt(sslStatusLatest.daysUntilExpiry, 30));
      conditions.push(gt(sslStatusLatest.daysUntilExpiry, 0));
    } else if (sslState === "invalid") {
      conditions.push(eq(sslStatusLatest.hasSSL, true));
      conditions.push(eq(sslStatusLatest.isValid, false));
    } else if (sslState === "none") {
      // Either no row in sslStatusLatest, or hasSSL=false
      conditions.push(
        or(isNull(sslStatusLatest.domainId), eq(sslStatusLatest.hasSSL, false)),
      );
    }

    const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;

    const baseSelect = db
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

    const itemsQuery = (
      needSslJoin
        ? baseSelect.leftJoin(
            sslStatusLatest,
            eq(domains.id, sslStatusLatest.domainId),
          )
        : baseSelect
    )
      .limit(limit)
      .offset(offset)
      .orderBy(desc(domains.createdAt));

    const items = whereExpr
      ? await itemsQuery.where(whereExpr).all()
      : await itemsQuery.all();

    // Total count for pagination (mirrors the same join + filters)
    const countSelectBase = db
      .select({ count: sql<number>`count(*)` })
      .from(domains)
      .leftJoin(
        domainStatusLatest,
        eq(domains.id, domainStatusLatest.domainId),
      );
    const countSelect = needSslJoin
      ? countSelectBase.leftJoin(
          sslStatusLatest,
          eq(domains.id, sslStatusLatest.domainId),
        )
      : countSelectBase;
    const totalRow = whereExpr
      ? await countSelect.where(whereExpr).get()
      : await countSelect.get();
    const total = Number(totalRow?.count || 0);

    // Parse tagsJson into a tags array for the frontend
    const data = items.map((item) => ({
      ...item,
      tags: JSON.parse(item.tagsJson || "[]"),
    }));

    return success({ items: data, total, page, limit });
  } catch (e: any) {
    return fail(e.message || "System Error", 50000);
  }
});
