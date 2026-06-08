import { describe, expect, it } from "vitest";
import {
  calculateRiskScore,
  highestOpenSeverity,
  summarizeDnsPosture,
} from "../server/utils/risk-summary";
import type { DnsSecurityRecords } from "../server/utils/security-scan";

const baseRecords: DnsSecurityRecords = {
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
  errors: {},
};

describe("risk summary utilities", () => {
  it("scores only open findings and caps the score at 100", () => {
    expect(
      calculateRiskScore([
        { severity: "HIGH", status: "OPEN" },
        { severity: "HIGH", status: "OPEN" },
        { severity: "HIGH", status: "OPEN" },
        { severity: "LOW", status: "RESOLVED" },
      ]),
    ).toBe(100);
  });

  it("reports the highest open severity", () => {
    expect(
      highestOpenSeverity([
        { severity: "LOW", status: "OPEN" },
        { severity: "HIGH", status: "RESOLVED" },
        { severity: "MEDIUM", status: "OPEN" },
      ]),
    ).toBe("MEDIUM");
  });

  it("derives DNS posture from the latest snapshot records", () => {
    const posture = summarizeDnsPosture({
      ...baseRecords,
      caa: [{ issue: "letsencrypt.org" }],
      ds: [{ keyTag: 12345 }],
      spf: ["v=spf1 -all"],
      dmarc: ["v=DMARC1; p=reject"],
      bimi: ["v=BIMI1; l=https://example.com/bimi.svg"],
    });

    expect(posture).toEqual({
      dnssecStatus: "SIGNED",
      dmarcPolicy: "reject",
      spfConfigured: true,
      caaConfigured: true,
      bimiConfigured: true,
    });
  });
});
