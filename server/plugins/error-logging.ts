import { getRequestURL } from "h3";
import { logger } from "../utils/logger";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("error", (error: Error, context: any) => {
    const event = context?.event;
    logger.error("Unhandled server error", {
      error,
      method: event?.method || event?.node?.req?.method || null,
      path: event ? getRequestURL(event).pathname : null,
    });
  });
});
