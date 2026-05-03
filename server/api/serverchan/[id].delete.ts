import { serverchanConfigs } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, "id") || "0");
  const db = useDb();

  await db.delete(serverchanConfigs).where(eq(serverchanConfigs.id, id));

  return {
    success: true,
  };
});
