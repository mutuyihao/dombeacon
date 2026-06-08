import { recordAuditEvent } from "../../utils/audit";
import {
  runBrandWatchScan,
  runDomainScan,
  runDailySummary,
} from "../../utils/tasks";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const taskName = body.task; // 'hourly-scan' | 'daily-summary'
  const triggeredAt = new Date();

  if (taskName === "hourly-scan") {
    runDomainScan().catch(console.error); // Run async background
    await recordAuditEvent({
      event,
      eventType: "tasks.trigger",
      outcome: "queued",
      actorType: "admin",
      metadata: { taskName },
    });
    return success({
      taskName,
      status: "queued",
      triggeredAt,
      msg: "Scan started in background",
    });
  }

  if (taskName === "daily-summary") {
    runDailySummary().catch(console.error);
    await recordAuditEvent({
      event,
      eventType: "tasks.trigger",
      outcome: "queued",
      actorType: "admin",
      metadata: { taskName },
    });
    return success({
      taskName,
      status: "queued",
      triggeredAt,
      msg: "Summary started in background",
    });
  }

  if (taskName === "brand-watch") {
    runBrandWatchScan().catch(console.error);
    await recordAuditEvent({
      event,
      eventType: "tasks.trigger",
      outcome: "queued",
      actorType: "admin",
      metadata: { taskName },
    });
    return success({
      taskName,
      status: "queued",
      triggeredAt,
      msg: "Brand watch scan started in background",
    });
  }

  await recordAuditEvent({
    event,
    eventType: "tasks.trigger",
    outcome: "failure",
    actorType: "admin",
    metadata: { taskName, reason: "unknown_task" },
  });
  return fail("Unknown task", 40001);
});
