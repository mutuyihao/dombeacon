import cron from "node-cron";
import { runDomainScan, runDailySummary } from "../utils/tasks";

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

  const timezone = (process.env.SCHEDULER_TIMEZONE || "UTC").trim() || "UTC";

  console.log(`Starting Scheduler... timezone=${timezone}`);

  // Hourly Scan (at minute 0)
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("Triggering hourly scan...");
      await runDomainScan();
    } catch (e: any) {
      console.error("Hourly scan failed:", e?.message || e);
    }
  }, { timezone });

  // Daily Summary (08:00)
  cron.schedule("0 8 * * *", async () => {
    try {
      console.log("Triggering daily summary...");
      await runDailySummary();
    } catch (e: any) {
      console.error("Daily summary failed:", e?.message || e);
    }
  }, { timezone });
});
