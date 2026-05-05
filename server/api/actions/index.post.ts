import { createAction } from "~/server/utils/actions";
import type { ActionType } from "~/server/utils/actions";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const domainId = Number(body?.domainId);
    const actionType = body?.actionType as string | undefined;
    const priority = body?.priority as string | undefined;
    const metadata = body?.metadata;

    if (!domainId || Number.isNaN(domainId) || !actionType || !priority) {
      return fail("domainId, actionType, and priority are required", 40000);
    }

    const validActionTypes: ActionType[] = [
      "WANTED_AVAILABLE",
      "WANTED_DROPPING",
      "OWNED_EXPIRING",
      "SSL_EXPIRING",
      "SSL_INVALID",
      "SCAN_FAILED",
    ];

    if (!validActionTypes.includes(actionType as ActionType)) {
      return fail(
        `Invalid actionType. Must be one of: ${validActionTypes.join(", ")}`,
        40000,
      );
    }

    if (!["LOW", "MEDIUM", "HIGH"].includes(priority)) {
      return fail("Invalid priority. Must be LOW, MEDIUM, or HIGH", 40000);
    }

    const action = await createAction({
      domainId,
      actionType: actionType as ActionType,
      priority,
      metadata,
    });

    return success(action);
  } catch (e: any) {
    return fail(e.message || "Failed to create action", 50000);
  }
});
