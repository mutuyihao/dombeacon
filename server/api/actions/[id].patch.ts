import { updateActionStatus } from "~/server/utils/actions";
import type { ActionStatus } from "~/server/utils/actions";

export default defineEventHandler(async (event) => {
  try {
    const id = Number(getRouterParam(event, "id"));
    if (!id || Number.isNaN(id)) {
      return fail("Invalid action id", 40000);
    }

    const body = await readBody(event);
    const status = body?.status as string | undefined;
    const snoozedUntil = body?.snoozedUntil as string | undefined;

    if (
      !status ||
      !["OPEN", "SNOOZED", "DISMISSED", "RESOLVED"].includes(status)
    ) {
      return fail(
        "Invalid status. Must be OPEN, SNOOZED, DISMISSED, or RESOLVED",
        40000,
      );
    }

    if (status === "SNOOZED" && !snoozedUntil) {
      return fail("snoozedUntil is required when status is SNOOZED", 40000);
    }

    const parsedSnoozedUntil = snoozedUntil ? new Date(snoozedUntil) : undefined;
    if (parsedSnoozedUntil && Number.isNaN(parsedSnoozedUntil.getTime())) {
      return fail("Invalid snoozedUntil", 40000);
    }

    await updateActionStatus(
      id,
      status as ActionStatus,
      parsedSnoozedUntil,
    );

    return success({ updated: true });
  } catch (e: any) {
    return fail(e.message || "Failed to update action", 50000);
  }
});
