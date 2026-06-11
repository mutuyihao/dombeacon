import { afterEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  resetRateLimitBucketsForTests,
} from "../server/utils/rate-limit";

afterEach(() => {
  resetRateLimitBucketsForTests();
});

describe("rate limit buckets", () => {
  it("allows requests until the configured limit is exceeded", () => {
    const first = consumeRateLimit({
      key: "client:a",
      limit: 2,
      windowMs: 60_000,
      now: 1000,
    });
    const second = consumeRateLimit({
      key: "client:a",
      limit: 2,
      windowMs: 60_000,
      now: 1001,
    });
    const third = consumeRateLimit({
      key: "client:a",
      limit: 2,
      windowMs: 60_000,
      now: 1002,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBe(60);
  });

  it("opens a new bucket after the window resets", () => {
    consumeRateLimit({
      key: "client:b",
      limit: 1,
      windowMs: 1000,
      now: 1000,
    });
    const blocked = consumeRateLimit({
      key: "client:b",
      limit: 1,
      windowMs: 1000,
      now: 1500,
    });
    const reset = consumeRateLimit({
      key: "client:b",
      limit: 1,
      windowMs: 1000,
      now: 2000,
    });

    expect(blocked.allowed).toBe(false);
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(0);
  });
});
