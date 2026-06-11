import { describe, expect, it } from "vitest";
import { isBlockedPrivateOrReservedAddress } from "../server/utils/ip-guard";

describe("IP guard", () => {
  it("blocks private and reserved IPv4 ranges", () => {
    expect(isBlockedPrivateOrReservedAddress("10.0.0.1")).toBe(true);
    expect(isBlockedPrivateOrReservedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedPrivateOrReservedAddress("192.168.1.10")).toBe(true);
    expect(isBlockedPrivateOrReservedAddress("203.0.113.10")).toBe(true);
  });

  it("allows public IPv4 addresses", () => {
    expect(isBlockedPrivateOrReservedAddress("8.8.8.8")).toBe(false);
    expect(isBlockedPrivateOrReservedAddress("1.1.1.1")).toBe(false);
  });

  it("blocks loopback, unique-local, and documentation IPv6 ranges", () => {
    expect(isBlockedPrivateOrReservedAddress("::1")).toBe(true);
    expect(isBlockedPrivateOrReservedAddress("fc00::1")).toBe(true);
    expect(isBlockedPrivateOrReservedAddress("2001:db8::1")).toBe(true);
  });
});
