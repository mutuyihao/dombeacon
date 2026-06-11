import { describe, expect, it } from "vitest";
import { apiError, fail, success } from "../server/utils/api";

describe("API envelope helpers", () => {
  it("returns success envelopes without throwing", () => {
    expect(success({ ok: true })).toEqual({
      code: 0,
      msg: "OK",
      data: { ok: true },
    });
  });

  it("returns failure envelopes without throwing", () => {
    expect(fail("Invalid input", 40000)).toEqual({
      code: 40000,
      msg: "Invalid input",
      data: null,
    });
  });

  it("keeps apiError compatible with the envelope contract", () => {
    expect(apiError("Conflict", 40900, { field: "domain" })).toEqual({
      code: 40900,
      msg: "Conflict",
      data: { field: "domain" },
    });
  });

  it("sanitizes obvious internal details in failure messages", () => {
    expect(fail("SQLITE_CONSTRAINT: UNIQUE constraint failed: domains.domain")).toEqual({
      code: 50000,
      msg: "Internal server error",
      data: null,
    });

    expect(apiError("Secret token leaked at D:\\app\\server.ts")).toEqual({
      code: 50000,
      msg: "Internal server error",
      data: null,
    });
  });
});
