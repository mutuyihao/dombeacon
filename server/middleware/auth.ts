import {
  ADMIN_SESSION_COOKIE,
  getConfiguredAdminPassword,
  isAuthExplicitlyDisabled,
  verifyAdminSessionToken,
} from "../utils/auth";

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;
  const isApiRequest = path.startsWith("/api/");
  const isPageRequest = !path.includes(".");

  // Allow login, auth endpoints, offline fallback, and static/PWA assets.
  if (
    path === "/login" ||
    path === "/offline" ||
    path === "/sw.js" ||
    path === "/manifest.webmanifest" ||
    path === "/api/health" ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/_nuxt/") ||
    path.startsWith("/icons/") ||
    path.startsWith("/favicon") ||
    path.startsWith("/robots")
  ) {
    return;
  }

  const adminPassword = getConfiguredAdminPassword();

  if (!adminPassword) {
    if (isAuthExplicitlyDisabled()) {
      return;
    }

    if (isApiRequest) {
      throw createError({
        statusCode: 503,
        message:
          "Authentication is not configured. Set ADMIN_PASSWORD or explicitly set AUTH_DISABLED=true.",
      });
    }
    if (isPageRequest) {
      return sendRedirect(event, "/login", 302);
    }
    return;
  }

  // Check for admin session cookie
  const session = getCookie(event, ADMIN_SESSION_COOKIE);

  // If accessing API (except auth) or pages, require authentication
  if (isApiRequest || isPageRequest) {
    const authenticated = verifyAdminSessionToken(session, adminPassword);
    if (!authenticated && isApiRequest) {
      throw createError({
        statusCode: 401,
        message: "Authentication required",
      });
    }
    if (!authenticated && isPageRequest) {
      return sendRedirect(event, "/login", 302);
    }
  }
});
