import { updateActionStatus } from "~/server/utils/actions";
import type { ActionStatus } from "~/server/utils/actions";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody(event);

  const { status, snoozedUntil } = body;

  if (!status || !["OPEN", "SNOOZED", "DISMISSED", "RESOLVED"].includes(status)) {
    throw createError({
      statusCode: 400,
      message: "Invalid status. Must be OPEN, SNOOZED, DISMISSED, or RESOLVED",
    });
  }

  if (status === "SNOOZED" && !snoozedUntil) {
    throw createError({
      statusCode: 400,
      message: "snoozedUntil is required when status is SNOOZED",
    });
  }

  await updateActionStatus(
    id,
    status as ActionStatus,
    snoozedUntil ? new Date(snoozedUntil) : undefined,
  );

  return { success: true };
});
