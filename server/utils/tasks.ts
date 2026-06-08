import {
  domains,
  taskLocks,
  taskRuns,
  domainStatusLatest,
  sslStatusLatest,
  brandWatchTerms,
} from "../db/schema";
import { eq, lt, or, and } from "drizzle-orm";
import { checkDomain } from "./scanner";
import { createAction } from "./actions";
import { sendNotification } from "./mail";
import { notifyWebhooks } from "./webhook";
import { notifyServerchan } from "./serverchan";
import { notifyPush } from "./push";
import { scanDomainSSL } from "./ssl";
import { scanDomainSecurity } from "./security-scan";
import { scanBrandWatchTerm } from "./brand-watch";
import { getCurrentRiskMetricsSnapshot } from "./risk-metrics";

const LOCK_TTL_MS = 1000 * 60 * 30; // 30 minutes
const SCAN_BATCH_SIZE = 5; // Domains processed in parallel per batch
const SCAN_BATCH_DELAY_MS = 1000; // Delay between batches to spare RDAP/SSL targets

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

const safeRiskMetricsSnapshot = async (db: ReturnType<typeof useDb>) => {
  try {
    return await getCurrentRiskMetricsSnapshot({ db });
  } catch (error: any) {
    console.warn("Risk metrics snapshot failed:", error?.message || error);
    return null;
  }
};

/**
 * Fan out a notification to all configured channels in parallel.
 * Returns the number of channels that succeeded.
 */
const fanoutNotification = async (params: {
  domainId?: number;
  actionId?: number;
  eventType: string;
  templateType?: "instant" | "daily" | "dropping_alert" | "action_created";
  templateData?: any;
  eventData: any;
  deduplicateHours?: number;
  channels?: {
    email?: boolean;
    webhook?: boolean;
    serverchan?: boolean;
    push?: boolean;
  };
}) => {
  const channels = params.channels ?? {
    email: true,
    webhook: true,
    serverchan: true,
    push: true,
  };

  const tasks: Promise<any>[] = [];

  if (channels.email && params.templateType) {
    tasks.push(
      sendNotification({
        domainId: params.domainId,
        actionId: params.actionId,
        eventType: params.eventType,
        templateType: params.templateType,
        templateData: params.templateData,
        deduplicateHours: params.deduplicateHours,
      }),
    );
  }
  if (channels.webhook) {
    tasks.push(
      notifyWebhooks({
        domainId: params.domainId,
        actionId: params.actionId,
        eventType: params.eventType,
        eventData: params.eventData,
      }),
    );
  }
  if (channels.serverchan) {
    tasks.push(
      notifyServerchan({
        domainId: params.domainId,
        actionId: params.actionId,
        eventType: params.eventType,
        eventData: params.eventData,
      }),
    );
  }
  if (channels.push) {
    tasks.push(
      notifyPush({
        domainId: params.domainId,
        actionId: params.actionId,
        eventType: params.eventType,
        eventData: params.eventData,
      }),
    );
  }

  await Promise.allSettled(tasks);
};

/**
 * Process a single domain: RDAP scan + SSL status + actions + fan-out notifications.
 * Returns a summary that the outer scanner aggregates.
 */
const processDomain = async (
  d: typeof domains.$inferSelect,
): Promise<{
  ok: boolean;
  newlyDropping?: { domain: string; id: number };
  actionIds: number[];
  securityFindings: number;
  error?: string;
}> => {
  const db = useDb();
  const actionIds: number[] = [];
  let securityFindings = 0;
  let newlyDropping: { domain: string; id: number } | undefined;

  try {
    let result: Awaited<ReturnType<typeof checkDomain>> = null;
    let rdapError: any = null;

    try {
      result = await checkDomain(d.domain, d.id);
    } catch (error: any) {
      rdapError = error;
    }

    // Update SSL status for every active domain. Only owned domains create
    // SSL actions/notifications, because those are account-owner obligations.
    try {
      const prevSSL = await db
        .select()
        .from(sslStatusLatest)
        .where(eq(sslStatusLatest.domainId, d.id))
        .get();

      const sslResult = await scanDomainSSL(d.id, d.domain);

      if (d.watchKind === "OWNED") {
        const isExpiring =
          sslResult.hasSSL &&
          sslResult.daysUntilExpiry !== undefined &&
          sslResult.daysUntilExpiry < 30;
        const isInvalid = sslResult.hasSSL && !sslResult.isValid;

        const prevDays = prevSSL?.daysUntilExpiry ?? null;
        const prevIsValid = prevSSL?.isValid ?? null;
        const prevHasSSL = prevSSL?.hasSSL ?? null;

        const becameExpiring =
          isExpiring && (prevDays === null || prevDays >= 30);
        const becameInvalid =
          isInvalid && (prevHasSSL !== true || prevIsValid !== false);

        if (isExpiring) {
          const action = await createAction({
            domainId: d.id,
            actionType: "SSL_EXPIRING",
            priority: d.priority,
            metadata: {
              daysUntilExpiry: sslResult.daysUntilExpiry,
              validTo: sslResult.validTo?.toISOString(),
              issuer: sslResult.issuer,
              domain: d.domain,
            },
          });

          if (becameExpiring) {
            actionIds.push(action.id);
            await fanoutNotification({
              domainId: d.id,
              actionId: action.id,
              eventType: "SSL_EXPIRING",
              templateType: "action_created",
              templateData: {
                domain: d.domain,
                actionType: "SSL_EXPIRING",
                priority: d.priority,
              },
              eventData: {
                domain: d.domain,
                watchKind: d.watchKind,
                priority: d.priority,
                issuer: sslResult.issuer,
                validTo: sslResult.validTo?.toISOString(),
                daysUntilExpiry: sslResult.daysUntilExpiry,
                actionId: action.id,
              },
              deduplicateHours: 24,
            });
          }
        }

        if (isInvalid) {
          const action = await createAction({
            domainId: d.id,
            actionType: "SSL_INVALID",
            priority: d.priority,
            metadata: {
              issuer: sslResult.issuer,
              validTo: sslResult.validTo?.toISOString(),
              domain: d.domain,
            },
          });

          if (becameInvalid) {
            actionIds.push(action.id);
            await fanoutNotification({
              domainId: d.id,
              actionId: action.id,
              eventType: "SSL_INVALID",
              templateType: "action_created",
              templateData: {
                domain: d.domain,
                actionType: "SSL_INVALID",
                priority: d.priority,
              },
              eventData: {
                domain: d.domain,
                watchKind: d.watchKind,
                priority: d.priority,
                issuer: sslResult.issuer,
                validTo: sslResult.validTo?.toISOString(),
                actionId: action.id,
              },
              deduplicateHours: 24,
            });
          }
        }
      }
    } catch (sslError: any) {
      console.error(`SSL check failed for ${d.domain}:`, sslError.message);
    }

    if (d.watchKind === "OWNED") {
      try {
        const securityResult = await scanDomainSecurity(d.id, d.domain, {
          notify: true,
        });
        securityFindings = securityResult.findings.length;
      } catch (securityError: any) {
        console.error(
          `DNS security scan failed for ${d.domain}:`,
          securityError.message,
        );
      }
    }

    if (rdapError) {
      throw rdapError;
    }

    // `checkDomain()` returns `null` only on scan failure (network error / non-404 non-OK).
    // Any non-null value means the scan succeeded and includes status transition info.
    if (result !== null) {
      // WANTED → AVAILABLE
      if (
        d.watchKind === "WANTED" &&
        result.newStatus === "AVAILABLE" &&
        result.changed
      ) {
        const action = await createAction({
          domainId: d.id,
          actionType: "WANTED_AVAILABLE",
          priority: d.priority,
          metadata: {
            oldStatus: result.oldStatus,
            newStatus: result.newStatus,
            domain: d.domain,
          },
        });
        actionIds.push(action.id);

        await fanoutNotification({
          domainId: d.id,
          actionId: action.id,
          eventType: "WANTED_AVAILABLE",
          templateType: "instant",
          templateData: {
            domain: d.domain,
            oldStatus: result.oldStatus,
            newStatus: result.newStatus,
          },
          eventData: {
            domain: d.domain,
            watchKind: d.watchKind,
            priority: d.priority,
            oldStatus: result.oldStatus,
            newStatus: result.newStatus,
            actionId: action.id,
          },
          deduplicateHours: 24,
        });
      }

      // WANTED → PENDING_DELETE
      if (
        d.watchKind === "WANTED" &&
        result.newStatus === "PENDING_DELETE" &&
        result.changed
      ) {
        const action = await createAction({
          domainId: d.id,
          actionType: "WANTED_DROPPING",
          priority: d.priority,
          metadata: {
            oldStatus: result.oldStatus,
            newStatus: result.newStatus,
            domain: d.domain,
          },
        });
        actionIds.push(action.id);
        newlyDropping = { domain: d.domain, id: d.id };

        await fanoutNotification({
          domainId: d.id,
          actionId: action.id,
          eventType: "WANTED_DROPPING",
          templateType: "instant",
          templateData: {
            domain: d.domain,
            oldStatus: result.oldStatus,
            newStatus: result.newStatus,
          },
          eventData: {
            domain: d.domain,
            watchKind: d.watchKind,
            priority: d.priority,
            oldStatus: result.oldStatus,
            newStatus: result.newStatus,
            actionId: action.id,
          },
          deduplicateHours: 24,
        });
      }

      // OWNED → EXPIRING
      if (d.watchKind === "OWNED" && result.newStatus === "EXPIRING") {
        const statusInfo = await db
          .select()
          .from(domainStatusLatest)
          .where(eq(domainStatusLatest.domainId, d.id))
          .get();

        if (statusInfo?.expiresAt) {
          const action = await createAction({
            domainId: d.id,
            actionType: "OWNED_EXPIRING",
            priority: d.priority,
            metadata: {
              expiresAt: statusInfo.expiresAt.toISOString(),
              domain: d.domain,
            },
          });
          actionIds.push(action.id);

          await fanoutNotification({
            domainId: d.id,
            actionId: action.id,
            eventType: "OWNED_EXPIRING",
            templateType: "instant",
            templateData: {
              domain: d.domain,
              oldStatus: result.oldStatus,
              newStatus: result.newStatus,
              expiresAt: statusInfo.expiresAt,
            },
            eventData: {
              domain: d.domain,
              watchKind: d.watchKind,
              priority: d.priority,
              expiresAt: statusInfo.expiresAt.toISOString(),
              actionId: action.id,
            },
            deduplicateHours: 72,
          });
        }
      }
    } else {
      // Scan returned null → SCAN_FAILED
      const action = await createAction({
        domainId: d.id,
        actionType: "SCAN_FAILED",
        priority: d.priority,
        metadata: { domain: d.domain, error: "Scan returned null" },
      });
      actionIds.push(action.id);
    }

    return { ok: true, actionIds, securityFindings, newlyDropping };
  } catch (e: any) {
    try {
      const action = await createAction({
        domainId: d.id,
        actionType: "SCAN_FAILED",
        priority: d.priority,
        metadata: { domain: d.domain, error: e.message },
      });
      actionIds.push(action.id);
    } catch (actionError) {
      console.error("Failed to create SCAN_FAILED action:", actionError);
    }
    return { ok: false, actionIds, securityFindings, error: e.message };
  }
};

/**
 * Chunk an array into fixed-size batches.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
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
  const newlyDropping: { domain: string; id: number }[] = [];
  const actionsCreated: number[] = [];
  let securityFindingsSeen = 0;

  try {
    const db = useDb();
    const activeDomains = await db
      .select()
      .from(domains)
      .where(eq(domains.isActive, true));

    const batches = chunk(activeDomains, SCAN_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const results = await Promise.allSettled(
        batch.map((d) => processDomain(d)),
      );

      results.forEach((r, idx) => {
        const d = batch[idx];
        checked++;
        if (r.status === "fulfilled") {
          if (r.value.ok) {
            success++;
          } else {
            fail++;
            errors.push({ domain: d.domain, error: r.value.error });
          }
          if (r.value.newlyDropping) newlyDropping.push(r.value.newlyDropping);
          actionsCreated.push(...r.value.actionIds);
          securityFindingsSeen += r.value.securityFindings;
        } else {
          fail++;
          errors.push({ domain: d.domain, error: String(r.reason) });
        }
      });

      // Throttle between batches (skip after last)
      if (i < batches.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, SCAN_BATCH_DELAY_MS),
        );
      }
    }

    // Aggregate dropping alert (single notification across all newly dropping)
    if (newlyDropping.length > 0) {
      await fanoutNotification({
        eventType: "DROPPING_ALERT",
        templateType: "dropping_alert",
        templateData: { domains: newlyDropping },
        eventData: { domains: newlyDropping },
        deduplicateHours: 0,
      });
    }
  } catch (e: any) {
    errors.push({ general: e.message });
  } finally {
    await releaseLock("hourly-scan");

    // Log run
    const db = useDb();
    const riskMetrics = await safeRiskMetricsSnapshot(db);
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
        actionsCreated: actionsCreated.length,
        securityFindingsSeen,
        riskMetrics,
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
    const db = useDb();

    // Get notable domains (expiring soon, pending delete, recently changed)
    const notableDomains = await db
      .select({
        domain: domains.domain,
        status: domainStatusLatest.status,
        expiresAt: domainStatusLatest.expiresAt,
        watchKind: domains.watchKind,
        priority: domains.priority,
      })
      .from(domains)
      .leftJoin(domainStatusLatest, eq(domains.id, domainStatusLatest.domainId))
      .where(
        and(
          eq(domains.isActive, true),
          or(
            eq(domainStatusLatest.status, "EXPIRING"),
            eq(domainStatusLatest.status, "PENDING_DELETE"),
            eq(domainStatusLatest.status, "AVAILABLE"),
          ),
        ),
      )
      .limit(50);

    const totalDomains = await db
      .select()
      .from(domains)
      .where(eq(domains.isActive, true))
      .then((r) => r.length);

    // Send daily summary across all channels
    await fanoutNotification({
      eventType: "DAILY_SUMMARY",
      templateType: "daily",
      templateData: { domains: notableDomains, totalDomains },
      eventData: { domains: notableDomains, totalDomains },
      deduplicateHours: 20,
    });

    console.log(
      `Daily summary sent with ${notableDomains.length} notable domains`,
    );
  } finally {
    await releaseLock("daily-summary");
    // Log run
    const db = useDb();
    const riskMetrics = await safeRiskMetricsSnapshot(db);
    await db.insert(taskRuns).values({
      taskName: "daily-summary",
      startedAt: new Date(start),
      finishedAt: new Date(),
      resultJson: JSON.stringify({ success: true, riskMetrics }),
    });
  }
};

export const runBrandWatchScan = async () => {
  if (!(await acquireLock("brand-watch"))) {
    console.log("Brand watch scan locked, skipping.");
    return;
  }

  const start = Date.now();
  let termsChecked = 0;
  let candidatesChecked = 0;
  let registered = 0;
  let available = 0;
  let unknown = 0;
  let error = 0;
  let ctDiscovered = 0;
  let ctError = 0;
  let notificationsSent = 0;
  const errors: any[] = [];

  try {
    const db = useDb();
    const now = new Date();
    const enabledTerms = await db
      .select()
      .from(brandWatchTerms)
      .where(eq(brandWatchTerms.enabled, true))
      .all();

    const dueTerms = enabledTerms.filter((term) => {
      if (!term.lastScannedAt) return true;
      const frequencyMs =
        Math.max(1, term.scanFrequencyHours || 24) * 60 * 60 * 1000;
      return now.getTime() - new Date(term.lastScannedAt).getTime() >= frequencyMs;
    });

    for (const term of dueTerms) {
      try {
        const result = await scanBrandWatchTerm(term, {
          db,
          limit: 100,
          includeCt: true,
          ctLimit: 50,
          notify: true,
        });
        termsChecked += 1;
        candidatesChecked += result.checked;
        registered += result.registered;
        available += result.available;
        unknown += result.unknown;
        error += result.error;
        ctDiscovered += result.ctDiscovered;
        ctError += result.ctError;
        notificationsSent += result.notificationsSent;
      } catch (scanError: any) {
        error += 1;
        errors.push({
          termId: term.id,
          term: term.term,
          error: scanError?.message || String(scanError),
        });
      }
    }
  } catch (taskError: any) {
    errors.push({ general: taskError?.message || String(taskError) });
  } finally {
    await releaseLock("brand-watch");

    const db = useDb();
    const riskMetrics = await safeRiskMetricsSnapshot(db);
    await db.insert(taskRuns).values({
      taskName: "brand-watch",
      startedAt: new Date(start),
      finishedAt: new Date(),
      resultJson: JSON.stringify({
        termsChecked,
        candidatesChecked,
        registered,
        available,
        unknown,
        error,
        ctDiscovered,
        ctError,
        notificationsSent,
        errors: errors.slice(0, 10),
        riskMetrics,
      }),
    });
  }
};
