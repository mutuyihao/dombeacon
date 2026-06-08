import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAdminSessionToken,
  getLoginClientKey,
  isAuthExplicitlyDisabled,
  shouldTrustProxyHeaders,
  verifyAdminSessionToken,
} from "../server/utils/auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("auth utilities", () => {
  it("requires AUTH_DISABLED to be explicitly enabled", () => {
    vi.stubEnv("AUTH_DISABLED", "");
    expect(isAuthExplicitlyDisabled()).toBe(false);

    vi.stubEnv("AUTH_DISABLED", "true");
    expect(isAuthExplicitlyDisabled()).toBe(true);
  });

  it("signs sessions with SESSION_SECRET instead of the admin password", () => {
    vi.stubEnv("SESSION_SECRET", "secret-one");
    const token = createAdminSessionToken("old-password", 1_000);

    expect(verifyAdminSessionToken(token, "old-password", 1_000)).toBe(true);
    expect(verifyAdminSessionToken(token, "new-password", 1_000)).toBe(false);

    vi.stubEnv("SESSION_SECRET", "secret-two");
    expect(verifyAdminSessionToken(token, "old-password", 1_000)).toBe(false);
  });

  it("ignores forwarded IP headers unless proxy trust is explicit", () => {
    const event = {
      node: {
        req: {
          headers: {
            "x-forwarded-for": "203.0.113.10, 10.0.0.1",
            "x-real-ip": "203.0.113.11",
          },
          socket: { remoteAddress: "10.1.1.5" },
        },
      },
    };

    vi.stubEnv("TRUST_PROXY_HEADERS", "");
    expect(shouldTrustProxyHeaders()).toBe(false);
    expect(getLoginClientKey(event)).toBe("10.1.1.5");

    vi.stubEnv("TRUST_PROXY_HEADERS", "true");
    expect(shouldTrustProxyHeaders()).toBe(true);
    expect(getLoginClientKey(event)).toBe("203.0.113.10");
  });
});
