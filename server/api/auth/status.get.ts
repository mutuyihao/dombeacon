import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "../../utils/auth";

export default defineEventHandler(async (event) => {
  try {
    const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();

    if (!adminPassword) {
      return success({
        authRequired: false,
        authenticated: true,
      });
    }

    const session = getCookie(event, ADMIN_SESSION_COOKIE);

    return success({
      authRequired: true,
      authenticated: verifyAdminSessionToken(session, adminPassword),
    });
  } catch (e: any) {
    return fail(e.message || "Failed to check auth status", 50000);
  }
});
