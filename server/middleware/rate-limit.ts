import { createError, defineEventHandler, getRequestURL } from "h3";
import { getBooleanEnv, getIntegerEnv } from "../utils/env";
import { getRequestClientKey } from "../utils/request";
import { consumeRateLimit } from "../utils/rate-limit";

type Rule = {
  id: string;
  methods: Set<string>;
  path: RegExp;
  limit: number;
  windowMs: number;
};

const isDisabled = () => getBooleanEnv("DISABLE_API_RATE_LIMIT");

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const getRules = (): Rule[] => {
  const mutationWindowMs = getIntegerEnv(
    "RATE_LIMIT_MUTATION_WINDOW_MS",
    60_000,
    1_000,
  );
  const heavyWindowMs = getIntegerEnv(
    "RATE_LIMIT_HEAVY_WINDOW_MS",
    5 * 60_000,
    1_000,
  );

  return [
    {
      id: "api_mutation",
      methods: mutatingMethods,
      path: /^\/api\//,
      limit: getIntegerEnv("RATE_LIMIT_MUTATION_MAX", 120, 1),
      windowMs: mutationWindowMs,
    },
    {
      id: "domains_create",
      methods: new Set(["POST"]),
      path: /^\/api\/domains\/?$/,
      limit: getIntegerEnv("RATE_LIMIT_DOMAINS_CREATE_MAX", 30, 1),
      windowMs: mutationWindowMs,
    },
    {
      id: "domains_import",
      methods: new Set(["POST"]),
      path: /^\/api\/domains\/import\/?$/,
      limit: getIntegerEnv("RATE_LIMIT_DOMAINS_IMPORT_MAX", 5, 1),
      windowMs: heavyWindowMs,
    },
    {
      id: "ssl_check_all",
      methods: new Set(["POST"]),
      path: /^\/api\/ssl\/check-all\/?$/,
      limit: getIntegerEnv("RATE_LIMIT_SSL_CHECK_ALL_MAX", 3, 1),
      windowMs: heavyWindowMs,
    },
    {
      id: "tasks_trigger",
      methods: new Set(["POST"]),
      path: /^\/api\/tasks\/trigger\/?$/,
      limit: getIntegerEnv("RATE_LIMIT_TASK_TRIGGER_MAX", 5, 1),
      windowMs: heavyWindowMs,
    },
  ];
};

const setRateLimitHeaders = (event: any, state: ReturnType<typeof consumeRateLimit>) => {
  event.node.res.setHeader("X-RateLimit-Limit", String(state.limit));
  event.node.res.setHeader("X-RateLimit-Remaining", String(state.remaining));
  event.node.res.setHeader("X-RateLimit-Reset", String(Math.ceil(state.resetAt / 1000)));
  if (!state.allowed) {
    event.node.res.setHeader("Retry-After", String(state.retryAfterSeconds));
  }
};

export default defineEventHandler((event) => {
  if (isDisabled()) return;

  const method = String(event.method || event.node?.req?.method || "GET")
    .trim()
    .toUpperCase();
  if (!mutatingMethods.has(method)) return;

  const pathname = getRequestURL(event).pathname;
  const clientKey = getRequestClientKey(event);

  for (const rule of getRules()) {
    if (!rule.methods.has(method) || !rule.path.test(pathname)) continue;

    const state = consumeRateLimit({
      key: `${rule.id}:${method}:${clientKey}`,
      limit: rule.limit,
      windowMs: rule.windowMs,
    });
    setRateLimitHeaders(event, state);

    if (!state.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too Many Requests",
        message: `Rate limit exceeded. Retry after ${state.retryAfterSeconds}s.`,
      });
    }
  }
});
