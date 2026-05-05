import { describe, expect, it, vi } from "vitest";
import { checkDomain } from "../server/utils/scanner";

describe("checkDomain()", () => {
  it("treats RDAP 404 as AVAILABLE and returns a non-null result", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 404 }));

    const updateStatusImpl = vi.fn(async (_domainId: number, status: string) => {
      return {
        changed: false,
        oldStatus: null,
        newStatus: status,
      };
    });

    const updateErrorImpl = vi.fn(async () => {});

    const result = await checkDomain("example.com", 1, {
      fetchImpl: fetchImpl as any,
      updateStatusImpl: updateStatusImpl as any,
      updateErrorImpl: updateErrorImpl as any,
    });

    expect(result).not.toBeNull();
    expect(result?.newStatus).toBe("AVAILABLE");
    expect(updateStatusImpl).toHaveBeenCalled();
    expect(updateErrorImpl).not.toHaveBeenCalled();
  });
});
