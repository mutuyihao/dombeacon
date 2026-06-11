import { afterEach, describe, expect, it } from "vitest";
import {
  getBooleanEnv,
  getEnvText,
  getIntegerEnv,
  isTruthyEnvValue,
} from "../server/utils/env";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("environment parsing utilities", () => {
  it("normalizes truthy environment values", () => {
    expect(isTruthyEnvValue("true")).toBe(true);
    expect(isTruthyEnvValue("  YES ")).toBe(true);
    expect(isTruthyEnvValue("on")).toBe(true);
    expect(isTruthyEnvValue("0")).toBe(false);
    expect(isTruthyEnvValue(undefined)).toBe(false);
  });

  it("returns trimmed text values", () => {
    process.env.DOMBEACON_TEST_TEXT = "  value  ";
    expect(getEnvText("DOMBEACON_TEST_TEXT")).toBe("value");
  });

  it("parses boolean env vars with a default fallback", () => {
    delete process.env.DOMBEACON_TEST_BOOL;
    expect(getBooleanEnv("DOMBEACON_TEST_BOOL", true)).toBe(true);
    process.env.DOMBEACON_TEST_BOOL = "off";
    expect(getBooleanEnv("DOMBEACON_TEST_BOOL", true)).toBe(false);
  });

  it("parses bounded integer env vars", () => {
    process.env.DOMBEACON_TEST_INT = "3.9";
    expect(getIntegerEnv("DOMBEACON_TEST_INT", 10, 5)).toBe(5);
    process.env.DOMBEACON_TEST_INT = "12";
    expect(getIntegerEnv("DOMBEACON_TEST_INT", 10, 5)).toBe(12);
    process.env.DOMBEACON_TEST_INT = "not-a-number";
    expect(getIntegerEnv("DOMBEACON_TEST_INT", 10, 5)).toBe(10);
  });
});
