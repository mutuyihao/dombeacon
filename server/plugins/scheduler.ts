import { runDomainScan, runDailySummary } from "../utils/tasks";
import {
  getNextDailyRun,
  getNextHourlyRun,
  normalizeTimeZone,
  scheduleRecurringTask,
} from "../utils/schedule";
import { logger } from "../utils/logger";

export default defineNitroPlugin((nitroApp) => {
  const parseBool = (v: string | undefined, defaultValue: boolean) => {
    if (v == null) return defaultValue;
    const s = String(v).trim().toLowerCase();
    if (!s) return defaultValue;
    if (["0", "false", "no", "off"].includes(s)) return false;
    if (["1", "true", "yes", "on"].includes(s)) return true;
    return defaultValue;
  };

  const enabled = parseBool(process.env.ENABLE_SCHEDULER, true);
  if (!enabled) {
    logger.info("Scheduler disabled via ENABLE_SCHEDULER");
    return;
  }

  const timezone = normalizeTimeZone(process.env.SCHEDULER_TIMEZONE || "UTC");

  logger.info("Starting scheduler", { timezone });

  const stopHourlyScan = scheduleRecurringTask(
    "Hourly scan",
    (now) => getNextHourlyRun(now, timezone),
    async () => {
      try {
        logger.info("Triggering hourly scan");
        await runDomainScan();
      } catch (e: any) {
        logger.error("Hourly scan failed", { error: e });
      }
    },
  );

  const stopDailySummary = scheduleRecurringTask(
    "Daily summary",
    (now) => getNextDailyRun(now, timezone, 8, 0),
    async () => {
      try {
        logger.info("Triggering daily summary");
        await runDailySummary();
      } catch (e: any) {
        logger.error("Daily summary failed", { error: e });
      }
    },
  );

  nitroApp.hooks.hookOnce("close", () => {
    stopHourlyScan();
    stopDailySummary();
  });
});
