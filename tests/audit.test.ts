import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAuditClient,
  sanitizeAuditMetadata,
} from "../server/utils/audit";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("audit utilities", () => {
  it("redacts sensitive metadata without hiding safe counters", () => {
    const metadata: any = {
      password: "secret",
      passConfigured: true,
      headerCount: 2,
      headers: { Authorization: "Bearer token" },
      nested: {
        sendKey: "SCT123456",
        accessToken: "token",
      },
    };
    metadata.self = metadata;

    const sanitized = sanitizeAuditMetadata(metadata) as any;

    expect(sanitized.password).toBe("[redacted]");
    expect(sanitized.passConfigured).toBe(true);
    expect(sanitized.headerCount).toBe(2);
    expect(sanitized.headers).toBe("[redacted]");
    expect(sanitized.nested.sendKey).toBe("[redacted]");
    expect(sanitized.nested.accessToken).toBe("[redacted]");
    expect(sanitized.self).toBe("[circular]");
  });

  it("uses trusted proxy headers only when explicitly enabled", () => {
    const event = {
      node: {
        req: {
          headers: {
            "user-agent": "Vitest Agent",
            "x-forwarded-for": "203.0.113.10, 10.0.0.1",
            "x-real-ip": "203.0.113.11",
          },
          socket: { remoteAddress: "10.1.1.5" },
        },
      },
    };

    vi.stubEnv("TRUST_PROXY_HEADERS", "");
    expect(getAuditClient(event).ipAddress).toBe("10.1.1.5");

    vi.stubEnv("TRUST_PROXY_HEADERS", "true");
    expect(getAuditClient(event)).toEqual({
      ipAddress: "203.0.113.10",
      userAgent: "Vitest Agent",
    });
  });
});
