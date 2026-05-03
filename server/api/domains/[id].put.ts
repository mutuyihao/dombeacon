import { domains } from "../../db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody(event);
  const db = useDb();

  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.watchKind !== undefined) {
      if (!["OWNED", "WANTED"].includes(body.watchKind)) {
        return fail("Invalid watchKind. Must be OWNED or WANTED", 40001);
      }
      updateData.watchKind = body.watchKind;
    }

    if (body.priority !== undefined) {
      if (!["LOW", "MEDIUM", "HIGH"].includes(body.priority)) {
        return fail("Invalid priority. Must be LOW, MEDIUM, or HIGH", 40001);
      }
      updateData.priority = body.priority;
    }

    if (body.note !== undefined) {
      updateData.note = body.note;
    }

    if (body.tags !== undefined) {
      updateData.tagsJson = JSON.stringify(body.tags);
    }

    if (body.group !== undefined) {
      updateData.groupName = body.group;
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    const result = await db
      .update(domains)
      .set(updateData)
      .where(eq(domains.id, id))
      .returning()
      .get();

    if (!result) {
      return fail("Domain not found", 40004);
    }

    return success(result);
  } catch (e: any) {
    return fail(e.message || "System Error", 50000);
  }
});
