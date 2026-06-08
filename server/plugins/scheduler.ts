import {
  runBrandWatchScan,
  runDomainScan,
  runDailySummary,
} from "../utils/tasks";
import {
  getNextDailyRun,
  getNextHourlyRun,
  normalizeTimeZone,
  scheduleRecurringTask,
} from "../utils/schedule";

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
    console.log("Scheduler disabled via ENABLE_SCHEDULER.");
    return;
  }

  const timezone = normalizeTimeZone(process.env.SCHEDULER_TIMEZONE || "UTC");

  console.log(`Starting Scheduler... timezone=${timezone}`);

  const stopHourlyScan = scheduleRecurringTask(
    "Hourly scan",
    (now) => getNextHourlyRun(now, timezone),
    async () => {
      try {
        console.log("Triggering hourly scan...");
        await runDomainScan();
      } catch (e: any) {
        console.error("Hourly scan failed:", e?.message || e);
      }
    },
  );

  const stopDailySummary = scheduleRecurringTask(
    "Daily summary",
    (now) => getNextDailyRun(now, timezone, 8, 0),
    async () => {
      try {
        console.log("Triggering daily summary...");
        await runDailySummary();
      } catch (e: any) {
        console.error("Daily summary failed:", e?.message || e);
      }
    },
  );

  const stopBrandWatchScan = scheduleRecurringTask(
    "Brand watch scan",
    (now) => getNextHourlyRun(now, timezone),
    async () => {
      try {
        console.log("Triggering brand watch scan...");
        await runBrandWatchScan();
      } catch (e: any) {
        console.error("Brand watch scan failed:", e?.message || e);
      }
    },
  );

  nitroApp.hooks.hookOnce("close", () => {
    stopHourlyScan();
    stopDailySummary();
    stopBrandWatchScan();
  });
});
