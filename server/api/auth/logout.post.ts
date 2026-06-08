import { ADMIN_SESSION_COOKIE } from "../../utils/auth";
import { recordAuditEvent } from "../../utils/audit";

export default defineEventHandler(async (event) => {
  deleteCookie(event, ADMIN_SESSION_COOKIE, { path: "/" });
  await recordAuditEvent({
    event,
    eventType: "auth.logout",
    outcome: "success",
    actorType: "admin",
  });
  return success({ loggedOut: true });
});
