import { serverchanConfigs } from "~/server/db/schema";

export default defineEventHandler(async (event) => {
  const db = useDb();

  const configs = await db.select().from(serverchanConfigs).all();

  return {
    success: true,
    data: configs,
  };
});
