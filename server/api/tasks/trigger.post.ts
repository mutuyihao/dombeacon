import { runDomainScan, runDailySummary } from "../../utils/tasks";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const taskName = body.task; // 'hourly-scan' | 'daily-summary'
  const triggeredAt = new Date();

  if (taskName === "hourly-scan") {
    runDomainScan().catch(console.error); // Run async background
    return success({
      taskName,
      status: "queued",
      triggeredAt,
      msg: "Scan started in background",
    });
  }

  if (taskName === "daily-summary") {
    runDailySummary().catch(console.error);
    return success({
      taskName,
      status: "queued",
      triggeredAt,
      msg: "Summary started in background",
    });
  }

  return fail("Unknown task", 40001);
});
