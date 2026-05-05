import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const SESSION_VERSION = 1;

type SessionPayload = {
  v: number;
  iat: number;
  exp: number;
  nonce: string;
};

type LoginBucket = {
  count: number;
  resetAt: number;
};

const loginBuckets = new Map<string, LoginBucket>();
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

const getSessionSecret = (adminPassword: string) => {
  return (process.env.SESSION_SECRET || adminPassword).trim();
};

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export const createAdminSessionToken = (
  adminPassword: string,
  nowMs = Date.now(),
) => {
  const secret = getSessionSecret(adminPassword);
  const nowSeconds = Math.floor(nowMs / 1000);
  const payload: SessionPayload = {
    v: SESSION_VERSION,
    iat: nowSeconds,
    exp: nowSeconds + ADMIN_SESSION_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
};

export const verifyAdminSessionToken = (
  token: string | undefined | null,
  adminPassword: string,
  nowMs = Date.now(),
) => {
  if (!token || !adminPassword) return false;

  const [encodedPayload, tokenSignature] = token.split(".");
  if (!encodedPayload || !tokenSignature) return false;

  const expectedSignature = sign(encodedPayload, getSessionSecret(adminPassword));
  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(tokenSignature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;
    const nowSeconds = Math.floor(nowMs / 1000);
    return (
      payload.v === SESSION_VERSION &&
      Number.isFinite(payload.exp) &&
      payload.exp > nowSeconds
    );
  } catch {
    return false;
  }
};

export const isPasswordMatch = (candidate: string, expected: string) => {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const getLoginClientKey = (event: any) => {
  const forwardedFor = String(
    event.node?.req?.headers?.["x-forwarded-for"] || "",
  )
    .split(",")[0]
    .trim();
  return (
    forwardedFor ||
    event.node?.req?.socket?.remoteAddress ||
    event.node?.req?.connection?.remoteAddress ||
    "unknown"
  );
};

export const getLoginRateLimitState = (key: string, nowMs = Date.now()) => {
  const bucket = loginBuckets.get(key);
  if (!bucket || bucket.resetAt <= nowMs) {
    return { limited: false, remainingSeconds: 0 };
  }
  return {
    limited: bucket.count >= LOGIN_MAX_FAILURES,
    remainingSeconds: Math.ceil((bucket.resetAt - nowMs) / 1000),
  };
};

export const recordLoginFailure = (key: string, nowMs = Date.now()) => {
  const existing = loginBuckets.get(key);
  if (!existing || existing.resetAt <= nowMs) {
    loginBuckets.set(key, {
      count: 1,
      resetAt: nowMs + LOGIN_WINDOW_MS,
    });
    return;
  }
  existing.count += 1;
};

export const clearLoginFailures = (key: string) => {
  loginBuckets.delete(key);
};

export const resetLoginRateLimitForTests = () => {
  loginBuckets.clear();
};
