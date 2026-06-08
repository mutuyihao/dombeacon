import { desc, eq } from "drizzle-orm";
import { brandWatchTerms } from "../../../db/schema";
import { serializeBrandWatchTerm } from "../../../utils/brand-watch";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const db = useDb();
    const enabled =
      query.enabled === "true" ? true : query.enabled === "false" ? false : null;

    let queryBuilder = db.select().from(brandWatchTerms);
    if (enabled !== null) {
      queryBuilder = queryBuilder.where(
        eq(brandWatchTerms.enabled, enabled),
      ) as typeof queryBuilder;
    }

    const rows = await queryBuilder
      .orderBy(desc(brandWatchTerms.createdAt), desc(brandWatchTerms.id))
      .all();

    return success({ items: rows.map(serializeBrandWatchTerm) });
  } catch (error: any) {
    return fail(error.message || "Failed to list brand watch terms", 50000);
  }
});
