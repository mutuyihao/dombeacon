import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  clearLoginFailures,
  createAdminSessionToken,
  getLoginClientKey,
  getLoginRateLimitState,
  isPasswordMatch,
  recordLoginFailure,
} from "../../utils/auth";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const password = String(body?.password || "");
    const clientKey = getLoginClientKey(event);

    const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();

    if (!adminPassword) {
      return fail("Authentication is not configured", 40001);
    }

    const rateLimit = getLoginRateLimitState(clientKey);
    if (rateLimit.limited) {
      return fail(
        `Too many failed login attempts. Try again in ${rateLimit.remainingSeconds}s`,
        42901,
      );
    }

    if (!isPasswordMatch(password, adminPassword)) {
      recordLoginFailure(clientKey);
      return fail("Invalid password", 40101);
    }

    clearLoginFailures(clientKey);
    const token = createAdminSessionToken(adminPassword);

    setCookie(event, ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return success({ loggedIn: true });
  } catch (e: any) {
    return fail(e.message || "Login failed", 50000);
  }
});
