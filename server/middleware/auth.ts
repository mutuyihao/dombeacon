import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "../utils/auth";

export default defineEventHandler(async (event) => {
  const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();

  // If no password configured, auth is disabled
  if (!adminPassword) {
    return;
  }

  const path = getRequestURL(event).pathname;

  // Allow login, auth endpoints, offline fallback, and static/PWA assets.
  if (
    path === "/login" ||
    path === "/offline" ||
    path === "/sw.js" ||
    path === "/manifest.webmanifest" ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/_nuxt/") ||
    path.startsWith("/icons/") ||
    path.startsWith("/favicon") ||
    path.startsWith("/robots")
  ) {
    return;
  }

  // Check for admin session cookie
  const session = getCookie(event, ADMIN_SESSION_COOKIE);

  // If accessing API (except auth) or pages, require authentication
  if (path.startsWith("/api/") || !path.includes(".")) {
    if (!verifyAdminSessionToken(session, adminPassword)) {
      throw createError({
        statusCode: 401,
        message: "Authentication required",
      });
    }
  }
});
