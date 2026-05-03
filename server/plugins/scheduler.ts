import cron from "node-cron";
import { runDomainScan, runDailySummary } from "../utils/tasks";

export default defineNitroPlugin((nitroApp) => {
  console.log("Starting Scheduler...");

  // Hourly Scan (at minute 0)
  cron.schedule("0 * * * *", async () => {
    console.log("Triggering hourly scan...");
    await runDomainScan();
  });

  // Daily Summary (08:00)
  cron.schedule("0 8 * * *", async () => {
    console.log("Triggering daily summary...");
    await runDailySummary();
  });
});
