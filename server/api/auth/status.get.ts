import {
  ADMIN_SESSION_COOKIE,
  getConfiguredAdminPassword,
  isAuthExplicitlyDisabled,
  verifyAdminSessionToken,
} from "../../utils/auth";

export default defineEventHandler(async (event) => {
  try {
    const adminPassword = getConfiguredAdminPassword();

    if (!adminPassword) {
      const authDisabled = isAuthExplicitlyDisabled();
      return success({
        authRequired: !authDisabled,
        authenticated: authDisabled,
        authConfigured: false,
        authDisabled,
      });
    }

    const session = getCookie(event, ADMIN_SESSION_COOKIE);

    return success({
      authRequired: true,
      authenticated: verifyAdminSessionToken(session, adminPassword),
      authConfigured: true,
      authDisabled: false,
    });
  } catch (e: any) {
    return fail(e.message || "Failed to check auth status", 50000);
  }
});
