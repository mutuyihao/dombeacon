import { describe, expect, it, vi } from "vitest";
import { sendWebhook } from "../server/utils/webhook";

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
  });
});
