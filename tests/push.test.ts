import { describe, expect, it } from "vitest";
import {
  formatPushPayload,
  normalizePushNavigationUrl,
} from "../server/utils/push";

describe("web push payload helpers", () => {
  it("builds bounded payload text and preserves event metadata", () => {
    const payload = formatPushPayload("SECURITY_FINDING_HIGH", {
      domain: "example.com",
      message: "A".repeat(500),
      url: "/risk/findings?status=open",
      dedupeKey: "security-finding:1",
    });

    expect(payload.title).toBe("Security risk: example.com");
    expect(payload.body.length).toBeLessThanOrEqual(240);
    expect(payload.body.endsWith("…")).toBe(true);
    expect(payload.url).toBe("/risk/findings?status=open");
    expect(payload.data).toMatchObject({
      eventType: "SECURITY_FINDING_HIGH",
      dedupeKey: "security-finding:1",
      url: "/risk/findings?status=open",
    });
  });

  it("falls back safely for malformed data and external navigation targets", () => {
    expect(normalizePushNavigationUrl("https://example.com/phish")).toBe(
      "/actions",
    );
    expect(normalizePushNavigationUrl("javascript:alert(1)")).toBe("/actions");
    expect(normalizePushNavigationUrl("/actions#latest")).toBe(
      "/actions#latest",
    );

    const payload = formatPushPayload("UNKNOWN_EVENT", undefined);
    expect(payload.title).toBe("DomBeacon: UNKNOWN_EVENT");
    expect(payload.body).toBe("Domain event received");
    expect(payload.url).toBe("/actions");
  });
});
