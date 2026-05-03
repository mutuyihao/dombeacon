import { createAction } from "~/server/utils/actions";
import type { ActionType } from "~/server/utils/actions";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const { domainId, actionType, priority, metadata } = body;

  if (!domainId || !actionType || !priority) {
    throw createError({
      statusCode: 400,
      message: "domainId, actionType, and priority are required",
    });
  }

  const validActionTypes = [
    "WANTED_AVAILABLE",
    "WANTED_DROPPING",
    "OWNED_EXPIRING",
    "SCAN_FAILED",
  ];

  if (!validActionTypes.includes(actionType)) {
    throw createError({
      statusCode: 400,
      message: `Invalid actionType. Must be one of: ${validActionTypes.join(", ")}`,
    });
  }

  const action = await createAction({
    domainId,
    actionType: actionType as ActionType,
    priority,
    metadata,
  });

  return action;
});
