import { getSecurityDashboardSummary } from "../../utils/security-dashboard";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const windowDays = query.windowDays ? Number(query.windowDays) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;
    const summary = await getSecurityDashboardSummary({ windowDays, limit });
    return success(summary);
  } catch (error: any) {
    return fail(error.message || "Failed to summarize security risk", 50000);
  }
});
