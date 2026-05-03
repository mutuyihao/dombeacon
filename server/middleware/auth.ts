export default defineEventHandler(async (event) => {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // If no password configured, auth is disabled
  if (!adminPassword) {
    return;
  }

  const path = event.path;

  // Allow auth endpoints and static assets
  if (
    path.startsWith("/api/auth/") ||
    path.startsWith("/_nuxt/") ||
    path.startsWith("/favicon") ||
    path.startsWith("/robots")
  ) {
    return;
  }

  // Check for admin session cookie
  const session = getCookie(event, "admin_session");

  // If accessing API (except auth) or pages, require authentication
  if (path.startsWith("/api/") || !path.includes(".")) {
    if (session !== adminPassword) {
      throw createError({
        statusCode: 401,
        message: "Authentication required",
      });
    }
  }
});
