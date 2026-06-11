import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isBlockedWebhookAddress,
  normalizeWebhookMethod,
  sendWebhook,
  validateWebhookTargetUrl,
} from "../server/utils/webhook";

const publicResolver = async () => [
  { address: "93.184.216.34", family: 4 as const },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendWebhook()", () => {
  it("does not send body for GET and moves payload to query string", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      event: "TEST",
      timestamp: "2025-01-01T00:00:00.000Z",
      data: { hello: "world" },
    };

    const result = await sendWebhook("https://example.com/hook", payload, {
      method: "GET",
      resolveHost: publicResolver,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [calledUrl, init] = fetchMock.mock.calls[0];
    const u = new URL(String(calledUrl));

    expect(u.searchParams.get("event")).toBe(payload.event);
    expect(u.searchParams.get("timestamp")).toBe(payload.timestamp);
    expect(u.searchParams.get("data")).toBe(JSON.stringify(payload.data));

    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(init?.redirect).toBe("manual");
  });

  it("rejects unsupported methods before sending", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWebhook(
      "https://example.com/hook",
      { event: "TEST", timestamp: "2025-01-01T00:00:00.000Z", data: {} },
      { method: "DELETE", resolveHost: publicResolver },
    );

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain("method");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks private webhook targets by default", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWebhook(
      "http://127.0.0.1:8080/hook",
      { event: "TEST", timestamp: "2025-01-01T00:00:00.000Z", data: {} },
      { method: "POST" },
    );

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain("private or reserved");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows private webhook targets only when explicitly enabled", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWebhook(
      "http://127.0.0.1:8080/hook",
      { event: "TEST", timestamp: "2025-01-01T00:00:00.000Z", data: {} },
      { method: "POST", allowPrivateTargets: true },
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not follow redirects", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("", {
          status: 302,
          headers: { Location: "http://127.0.0.1:8080/hook" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWebhook(
      "https://example.com/hook",
      { event: "TEST", timestamp: "2025-01-01T00:00:00.000Z", data: {} },
      { method: "POST", resolveHost: publicResolver },
    );

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe("Webhook redirects are not followed");
    expect(result.httpStatus).toBe(302);
  });
});

describe("webhook URL policy", () => {
  it("normalizes allowed methods", () => {
    expect(normalizeWebhookMethod("patch")).toBe("PATCH");
    expect(normalizeWebhookMethod("DELETE")).toBe("");
  });

  it("blocks private and reserved IP literals", () => {
    expect(isBlockedWebhookAddress("10.0.0.1")).toBe(true);
    expect(isBlockedWebhookAddress("127.0.0.1")).toBe(true);
    expect(isBlockedWebhookAddress("::1")).toBe(true);
    expect(isBlockedWebhookAddress("203.0.113.5")).toBe(true);
    expect(isBlockedWebhookAddress("93.184.216.34")).toBe(false);
  });

  it("rejects non-http protocols", async () => {
    const result = await validateWebhookTargetUrl("file:///etc/passwd");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("http or https");
  });

  it("rejects hostnames resolving to private addresses", async () => {
    const result = await validateWebhookTargetUrl("https://internal.example/hook", {
      resolveHost: async () => [{ address: "192.168.1.10", family: 4 as const }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("private or reserved");
  });

  it("rejects private IPv6 URL literals", async () => {
    const result = await validateWebhookTargetUrl("http://[::1]:8080/hook");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("private or reserved");
  });
});
