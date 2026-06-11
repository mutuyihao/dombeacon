export type ApiEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
};

export type ApiSuccessEnvelope<T> = ApiEnvelope<T> & {
  code: 0;
};

export type ApiFailureEnvelope<T = null> = ApiEnvelope<T> & {
  code: number;
};

const INTERNAL_ERROR_MESSAGE = "Internal server error";
const INTERNAL_ERROR_PATTERNS = [
  /\bSQLITE_/i,
  /\bSQL\b/i,
  /\bconstraint\b/i,
  /\bstack\b/i,
  /\bsecret\b/i,
  /\btoken\b/i,
  /\bpassword\b/i,
  /\bnode_modules\b/i,
  /\bbetter-sqlite3\b/i,
  /[A-Z]:\\/,
  /\/app\//,
  /\bat\s+\S+\s+\(/,
];

export const sanitizeApiMessage = (
  msg: unknown,
  fallback = INTERNAL_ERROR_MESSAGE,
) => {
  const text = String(msg || "").trim();
  if (!text) return fallback;
  return INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(text))
    ? fallback
    : text;
};

export const apiResponse = <T>(
  data: T,
  msg: string = "OK",
  code: number = 0,
): ApiEnvelope<T> => {
  return { code, msg, data };
};

export const apiError = (
  msg: string,
  code: number = 50000,
  data: unknown = null,
): ApiFailureEnvelope<unknown> => apiResponse(data, sanitizeApiMessage(msg), code);

// Helper for simplified return
export const success = <T>(data: T): ApiSuccessEnvelope<T> =>
  apiResponse(data, "OK", 0) as ApiSuccessEnvelope<T>;

export const fail = (
  msg: string,
  code: number = 50000,
): ApiFailureEnvelope => apiResponse(null, sanitizeApiMessage(msg), code);
