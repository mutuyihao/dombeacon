import { describe, expect, it } from "vitest";
import {
  buildDnsRecordHash,
  collectDnsSecuritySnapshot,
  evaluateDnsFindings,
  type DnsResolver,
  type DnsSecurityRecords,
} from "../server/utils/security-scan";

const noData = () => Object.assign(new Error("no data"), { code: "ENODATA" });

const makeResolver = (overrides?: Partial<DnsResolver>): DnsResolver => ({
  resolve4: async () => ["192.0.2.10"],
  resolve6: async () => {
    throw noData();
  },
  resolveCname: async () => {
    throw noData();
  },
  resolveMx: async () => [{ exchange: "Mail.Example.COM.", priority: 10 }],
  resolveNs: async () => ["NS2.Example.COM.", "ns1.example.com"],
  resolveTxt: async (hostname: string) => {
    if (hostname.startsWith("_dmarc.")) {
      return [["v=DMARC1; p=none; pct=50"]];
    }
    if (hostname.startsWith("default._bimi.")) {
      return [["v=BIMI1; l=https://example.com/bimi.svg"]];
    }
    return [["v=spf1 include:_spf.example.com -all"]];
  },
  resolveCaa: async () => [],
  resolve: async () => [],
  ...overrides,
});

describe("DNS security scan utilities", () => {
  it("normalizes DNS records and evaluates baseline email/DNS findings", async () => {
    const records = await collectDnsSecuritySnapshot("Example.COM.", {
      resolver: makeResolver(),
    });

    expect(records.domain).toBe("example.com");
    expect(records.ns).toEqual(["ns1.example.com", "ns2.example.com"]);
    expect(records.mx).toEqual([
      { exchange: "mail.example.com", priority: 10 },
    ]);
    expect(records.spf).toEqual(["v=spf1 include:_spf.example.com -all"]);
    expect(records.dmarc).toEqual(["v=DMARC1; p=none; pct=50"]);

    const findings = evaluateDnsFindings(records);
    expect(findings.map((finding) => finding.findingType).sort()).toEqual([
      "CAA_MISSING",
      "DMARC_WEAK_POLICY",
      "DNSSEC_UNSIGNED",
    ]);
  });

  it("detects nameserver and MX drift against the previous snapshot", async () => {
    const current = await collectDnsSecuritySnapshot("example.com", {
      resolver: makeResolver({
        resolveMx: async () => [{ exchange: "mx2.example.com", priority: 5 }],
        resolveNs: async () => ["ns3.example.com"],
        resolveTxt: async (hostname: string) => {
          if (hostname.startsWith("_dmarc.")) {
            return [["v=DMARC1; p=reject"]];
          }
          throw noData();
        },
        resolveCaa: async () => [{ critical: 0, issue: "letsencrypt.org" }],
        resolve: async () => [{ keyTag: 12345, algorithm: 13, digestType: 2 }],
      }),
    });
    const previous: DnsSecurityRecords = {
      ...current,
      ns: ["ns1.example.com"],
      mx: [{ exchange: "mx1.example.com", priority: 10 }],
    };

    const findings = evaluateDnsFindings(current, previous);
    expect(findings.map((finding) => finding.findingType).sort()).toEqual([
      "MX_DRIFT",
      "NAMESERVER_DRIFT",
    ]);
  });

  it("builds the same hash for equivalent normalized records", async () => {
    const first = await collectDnsSecuritySnapshot("example.com", {
      resolver: makeResolver({
        resolveNs: async () => ["ns2.example.com", "ns1.example.com"],
      }),
    });
    const second = await collectDnsSecuritySnapshot("example.com", {
      resolver: makeResolver({
        resolveNs: async () => ["NS1.EXAMPLE.COM.", "ns2.example.com"],
      }),
    });

    expect(buildDnsRecordHash(first)).toBe(buildDnsRecordHash(second));
  });

  it("does not report missing controls when the DNS lookup itself failed", () => {
    const records: DnsSecurityRecords = {
      domain: "example.com",
      a: [],
      aaaa: [],
      cname: [],
      ns: [],
      mx: [],
      txt: [],
      caa: [],
      ds: [],
      spf: [],
      dmarc: [],
      bimi: [],
      errors: {
        CAA: "SERVFAIL",
        DMARC: "SERVFAIL",
        DS: "SERVFAIL",
      },
    };

    expect(evaluateDnsFindings(records)).toEqual([]);
  });
});
