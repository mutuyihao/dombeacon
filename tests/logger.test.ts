import { describe, expect, it } from "vitest";
import { redactLogMeta } from "../server/utils/logger";

describe("logger metadata redaction", () => {
  it("redacts sensitive notification and auth fields", () => {
    const sanitized = redactLogMeta({
      endpoint: "https://push.example/subscription",
      auth: "push-auth-secret",
      headers: { Authorization: "Bearer token" },
      nested: {
        sendKey: "SCT123456",
        p256dh: "browser-key",
        safeCount: 2,
      },
    });

    expect(sanitized.endpoint).toBe("[redacted]");
    expect(sanitized.auth).toBe("[redacted]");
    expect(sanitized.headers).toBe("[redacted]");
    expect(sanitized.nested).toMatchObject({
      sendKey: "[redacted]",
      p256dh: "[redacted]",
      safeCount: 2,
    });
  });

  it("handles circular metadata safely", () => {
    const value: Record<string, unknown> = { name: "loop" };
    value.self = value;
    expect(redactLogMeta(value)).toEqual({
      name: "loop",
      self: "[circular]",
    });
  });
});
