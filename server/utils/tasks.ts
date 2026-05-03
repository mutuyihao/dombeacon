import { domains, taskLocks, taskRuns } from "../db/schema";
import { eq, lt } from "drizzle-orm";
import { checkDomain } from "./scanner";

const LOCK_TTL_MS = 1000 * 60 * 30; // 30 minutes

async function acquireLock(taskName: string): Promise<boolean> {
  const db = useDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);
  const ownerId = Math.random().toString(36).substring(7);

  // Clean old locks
  await db
    .update(taskLocks)
    .set({ lockedUntil: new Date(0) }) // effectively expire
    .where(lt(taskLocks.lockedUntil, now));

  try {
    // Try to insert
    await db.insert(taskLocks).values({
      taskName,
      lockedUntil: expiresAt,
      ownerId,
    });
    return true;
  } catch (e: any) {
    if (e.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      // Exists, check if expired (double check race)
      const currentHook = await db
        .select()
        .from(taskLocks)
        .where(eq(taskLocks.taskName, taskName))
        .get();
      if (
        currentHook &&
        currentHook.lockedUntil &&
        new Date(currentHook.lockedUntil) < now
      ) {
        // Expired, take it
        await db
          .update(taskLocks)
          .set({ lockedUntil: expiresAt, ownerId })
          .where(eq(taskLocks.taskName, taskName));
        return true;
      }
    }
    return false;
  }
}

async function releaseLock(taskName: string) {
  const db = useDb();
  await db.delete(taskLocks).where(eq(taskLocks.taskName, taskName));
}

export const runDomainScan = async () => {
  if (!(await acquireLock("hourly-scan"))) {
    console.log("Hourly scan locked, skipping.");
    return;
  }

  const start = Date.now();
  let checked = 0;
  let success = 0;
  let fail = 0;
  const errors: any[] = [];
  const newlyDropping: any[] = [];

  try {
    const db = useDb();
    const activeDomains = await db
      .select()
      .from(domains)
      .where(eq(domains.isActive, true));

    for (const d of activeDomains) {
      try {
        const result = await checkDomain(d.domain, d.id);
        if (result?.changed && result.newStatus === "DROPPING") {
          newlyDropping.push({ domain: d.domain, id: d.id });
        }
        success++;
      } catch (e: any) {
        fail++;
        errors.push({ domain: d.domain, error: e.message });
      }
      checked++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Trigger alert if newly dropping domains found
    if (newlyDropping.length > 0) {
      const { sendMail, getTemplate } = await import("./mail");
      const { subject, html } = getTemplate("dropping_alert", {
        domains: newlyDropping,
      });
      await sendMail(subject, html);
    }
  } catch (e: any) {
    errors.push({ general: e.message });
  } finally {
    await releaseLock("hourly-scan");
    const duration = Date.now() - start;

    // Log run
    const db = useDb();
    await db.insert(taskRuns).values({
      taskName: "hourly-scan",
      startedAt: new Date(start),
      finishedAt: new Date(),
      resultJson: JSON.stringify({
        checked,
        success,
        fail,
        errors: errors.slice(0, 10),
        newlyDropping: newlyDropping.length,
      }),
    });
  }
};

export const runDailySummary = async () => {
  if (!(await acquireLock("daily-summary"))) {
    return;
  }
  const start = Date.now();
  try {
    // TODO: Implement Email Sending
    console.log("Daily summary running... (email sending to be implemented)");
  } finally {
    await releaseLock("daily-summary");
    // Log run
    const db = useDb();
    await db.insert(taskRuns).values({
      taskName: "daily-summary",
      startedAt: new Date(start),
      finishedAt: new Date(),
      resultJson: JSON.stringify({ success: true }),
    });
  }
};
