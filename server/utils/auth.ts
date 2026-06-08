import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const SESSION_VERSION = 1;
const PROCESS_LOCAL_SESSION_SECRET = randomBytes(32).toString("base64url");

type SessionPayload = {
  v: number;
  iat: number;
  exp: number;
  nonce: string;
  passwordBinding: string;
};

type LoginBucket = {
  count: number;
  resetAt: number;
};

const loginBuckets = new Map<string, LoginBucket>();
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;

const truthyEnvValues = new Set(["1", "true", "yes", "on"]);

const isTruthyEnv = (value: string | undefined) =>
  truthyEnvValues.has(String(value || "").trim().toLowerCase());

export const getConfiguredAdminPassword = () =>
  (process.env.ADMIN_PASSWORD || "").trim();

export const isAuthExplicitlyDisabled = () =>
  isTruthyEnv(process.env.AUTH_DISABLED);

export const shouldTrustProxyHeaders = () =>
  isTruthyEnv(process.env.TRUST_PROXY_HEADERS);

const getSessionSecret = () => {
  return (process.env.SESSION_SECRET || PROCESS_LOCAL_SESSION_SECRET).trim();
};

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export const createAdminSessionToken = (
  adminPassword: string,
  nowMs = Date.now(),
) => {
  const secret = getSessionSecret();
  const nowSeconds = Math.floor(nowMs / 1000);
  const payload: SessionPayload = {
    v: SESSION_VERSION,
    iat: nowSeconds,
    exp: nowSeconds + ADMIN_SESSION_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("base64url"),
    passwordBinding: sign(adminPassword, secret),
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

  const expectedSignature = sign(encodedPayload, getSessionSecret());
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
      payload.exp > nowSeconds &&
      payload.passwordBinding === sign(adminPassword, getSessionSecret())
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
  const headers = event.node?.req?.headers || {};
  const headerValue = (name: string) => {
    const value = headers[name] || headers[name.toLowerCase()];
    if (Array.isArray(value)) return String(value[0] || "");
    return String(value || "");
  };

  const forwardedFor = shouldTrustProxyHeaders()
    ? headerValue("x-forwarded-for").split(",")[0].trim()
    : "";
  const realIp = shouldTrustProxyHeaders()
    ? headerValue("x-real-ip").trim()
    : "";

  return (
    forwardedFor ||
    realIp ||
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
