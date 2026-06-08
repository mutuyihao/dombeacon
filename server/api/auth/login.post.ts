import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  clearLoginFailures,
  createAdminSessionToken,
  getConfiguredAdminPassword,
  getLoginClientKey,
  getLoginRateLimitState,
  isAuthExplicitlyDisabled,
  isPasswordMatch,
  recordLoginFailure,
  shouldTrustProxyHeaders,
} from "../../utils/auth";
import { recordAuditEvent } from "../../utils/audit";

const getRequestHeader = (event: any, name: string) => {
  const headers = event.node?.req?.headers || {};
  const value = headers[name] || headers[name.toLowerCase()];
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
};

const shouldUseSecureCookie = (event: any) => {
  if (getRequestURL(event).protocol === "https:") return true;
  if (!shouldTrustProxyHeaders()) return false;
  return (
    getRequestHeader(event, "x-forwarded-proto")
      .split(",")[0]
      ?.trim()
      .toLowerCase() === "https"
  );
};

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const password = String(body?.password || "");
    const clientKey = getLoginClientKey(event);

    const adminPassword = getConfiguredAdminPassword();

    if (!adminPassword) {
      if (isAuthExplicitlyDisabled()) {
        await recordAuditEvent({
          event,
          eventType: "auth.login",
          outcome: "success",
          actorType: "admin",
          metadata: { authDisabled: true },
        });
        return success({ loggedIn: true, authDisabled: true });
      }

      await recordAuditEvent({
        event,
        eventType: "auth.login",
        outcome: "blocked",
        actorType: "anonymous",
        actorId: null,
        metadata: { reason: "auth_not_configured" },
      });
      return fail(
        "Authentication is not configured. Set ADMIN_PASSWORD or explicitly set AUTH_DISABLED=true.",
        40001,
      );
    }

    const rateLimit = getLoginRateLimitState(clientKey);
    if (rateLimit.limited) {
      await recordAuditEvent({
        event,
        eventType: "auth.login",
        outcome: "rate_limited",
        actorType: "anonymous",
        actorId: null,
        metadata: { remainingSeconds: rateLimit.remainingSeconds },
      });
      return fail(
        `Too many failed login attempts. Try again in ${rateLimit.remainingSeconds}s`,
        42901,
      );
    }

    if (!isPasswordMatch(password, adminPassword)) {
      recordLoginFailure(clientKey);
      await recordAuditEvent({
        event,
        eventType: "auth.login",
        outcome: "failure",
        actorType: "anonymous",
        actorId: null,
        metadata: { reason: "invalid_password" },
      });
      return fail("Invalid password", 40101);
    }

    clearLoginFailures(clientKey);
    const token = createAdminSessionToken(adminPassword);

    setCookie(event, ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: shouldUseSecureCookie(event),
      sameSite: "lax",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    await recordAuditEvent({
      event,
      eventType: "auth.login",
      outcome: "success",
      actorType: "admin",
    });
    return success({ loggedIn: true });
  } catch (e: any) {
    await recordAuditEvent({
      event,
      eventType: "auth.login",
      outcome: "failure",
      actorType: "anonymous",
      actorId: null,
      metadata: { reason: "login_error", error: e?.message || String(e) },
    });
    return fail(e.message || "Login failed", 50000);
  }
});
