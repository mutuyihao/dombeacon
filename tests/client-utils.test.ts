import { describe, expect, it } from "vitest";
import { unwrapApiEnvelope } from "../utils/api-envelope";
import { isValidDomainName, normalizeDomainInput } from "../utils/domain";

describe("client API envelope helpers", () => {
  it("unwraps successful envelopes", () => {
    expect(unwrapApiEnvelope({ code: 0, data: { ok: true } })).toEqual({
      ok: true,
    });
  });

  it("throws response messages or fallback messages for failed envelopes", () => {
    expect(() =>
      unwrapApiEnvelope({ code: 40000, msg: "Invalid domain", data: null }),
    ).toThrow("Invalid domain");

    expect(() => unwrapApiEnvelope(null, "Network unavailable")).toThrow(
      "Network unavailable",
    );
  });
});

describe("domain input helpers", () => {
  it("normalizes user-entered domains before validation", () => {
    expect(normalizeDomainInput("  .Example.COM.  ")).toBe("example.com");
    expect(normalizeDomainInput(null)).toBe("");
  });

  it("accepts valid host names and rejects malformed labels", () => {
    expect(isValidDomainName("example.com")).toBe(true);
    expect(isValidDomainName("sub-domain.example.co")).toBe(true);
    expect(isValidDomainName("localhost")).toBe(false);
    expect(isValidDomainName("example..com")).toBe(false);
    expect(isValidDomainName("-example.com")).toBe(false);
    expect(isValidDomainName("example-.com")).toBe(false);
  });
});
