import { serverchanConfigs } from "~/server/db/schema";
import { recordAuditEvent } from "~/server/utils/audit";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, "id") || "0");
  if (!id) return fail("Invalid ServerChan id", 40000);
  const db = useDb();

  await db.delete(serverchanConfigs).where(eq(serverchanConfigs.id, id));
  await recordAuditEvent({
    event,
    eventType: "notifications.serverchan_delete",
    outcome: "success",
    actorType: "admin",
    metadata: { id },
  });

  return success({ deleted: true });
});
