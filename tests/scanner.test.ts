import { describe, expect, it, vi } from "vitest";
import {
  buildRdapDomainUrl,
  checkDomain,
  resetRdapBootstrapCacheForTests,
} from "../server/utils/scanner";

describe("checkDomain()", () => {
  it("treats RDAP 404 as AVAILABLE and returns a non-null result", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 404 }));
    const resolveRdapServiceBaseImpl = vi.fn(async () => "https://rdap.test/");

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
      resolveRdapServiceBaseImpl,
      updateStatusImpl: updateStatusImpl as any,
      updateErrorImpl: updateErrorImpl as any,
    });

    expect(result).not.toBeNull();
    expect(result?.newStatus).toBe("AVAILABLE");
    expect(updateStatusImpl).toHaveBeenCalled();
    expect(updateErrorImpl).not.toHaveBeenCalled();
  });

  it("discovers the RDAP service from the IANA bootstrap before querying a domain", async () => {
    resetRdapBootstrapCacheForTests();

    const fetchImpl = vi.fn(async (url: string) => {
      if (url === "https://data.iana.org/rdap/dns.json") {
        return new Response(
          JSON.stringify({
            services: [[["test"], ["https://rdap.test/rdap/"]]],
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          status: ["active"],
          events: [],
          entities: [],
          nameservers: [],
        }),
        { status: 200 },
      );
    });

    const updateStatusImpl = vi.fn(async (_domainId: number, status: string) => {
      return {
        changed: true,
        oldStatus: null,
        newStatus: status,
      };
    });

    const result = await checkDomain("brand.test", 2, {
      fetchImpl: fetchImpl as any,
      updateStatusImpl: updateStatusImpl as any,
      updateErrorImpl: vi.fn(async () => {}) as any,
    });

    expect(result?.newStatus).toBe("REGISTERED");
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://rdap.test/rdap/domain/brand.test",
      expect.any(Object),
    );
  });

  it("does not add a duplicate RDAP domain segment when the service already includes it", () => {
    expect(buildRdapDomainUrl("https://rdap.example/domain/", "example.com")).toBe(
      "https://rdap.example/domain/example.com",
    );
  });

  it("persists RDAP statuses in the structured summary", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: ["active", "client transfer prohibited"],
          events: [],
          entities: [],
          nameservers: [],
        }),
        { status: 200 },
      ),
    );
    const updateStatusImpl = vi.fn(async (_domainId: number, status: string) => {
      return {
        changed: true,
        oldStatus: null,
        newStatus: status,
      };
    });

    await checkDomain("example.test", 3, {
      fetchImpl: fetchImpl as any,
      resolveRdapServiceBaseImpl: vi.fn(async () => "https://rdap.test/"),
      updateStatusImpl: updateStatusImpl as any,
      updateErrorImpl: vi.fn(async () => {}) as any,
    });

    const rdapSummaryJson = updateStatusImpl.mock.calls[0][7];
    expect(JSON.parse(rdapSummaryJson).statuses).toEqual([
      "active",
      "client transfer prohibited",
    ]);
  });
});
