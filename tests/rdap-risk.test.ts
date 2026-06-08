import { describe, expect, it } from "vitest";
import {
  evaluateRdapFindings,
  parseRdapSummaryStatuses,
  summarizeRegistrarLockStatus,
} from "../server/utils/rdap-risk";

describe("RDAP risk utilities", () => {
  it("treats client or server transfer-prohibited statuses as locked", () => {
    expect(
      summarizeRegistrarLockStatus(["active", "client transfer prohibited"]),
    ).toBe("LOCKED");
    expect(
      summarizeRegistrarLockStatus(["serverTransferProhibited"]),
    ).toBe("LOCKED");
  });

  it("flags a missing transfer lock when RDAP statuses are known", () => {
    const findings = evaluateRdapFindings([
      "active",
      "client update prohibited",
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      findingType: "REGISTRAR_LOCK_MISSING",
      severity: "MEDIUM",
      evidence: {
        lockStatus: "PARTIAL",
        presentLocks: ["clientupdateprohibited"],
      },
    });
  });

  it("parses statuses from persisted RDAP summaries", () => {
    expect(
      parseRdapSummaryStatuses(
        JSON.stringify({
          statuses: ["active", "clientTransferProhibited"],
        }),
      ),
    ).toEqual(["active", "clientTransferProhibited"]);
  });
});
