import { domains } from "../../db/schema";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = useDb();

  try {
    if (!body.domain) {
      return fail("Domain is required", 40001);
    }

    const domainName = body.domain.trim().toLowerCase();

    const result = await db
      .insert(domains)
      .values({
        domain: domainName,
        note: body.note || "",
        tagsJson: JSON.stringify(body.tags || []),
        groupName: body.group || null,
      })
      .returning()
      .get();

    return success(result);
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return fail("Domain already exists", 40002);
    }
    return fail(e.message || "System Error", 50000);
  }
});
