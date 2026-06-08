import { describe, expect, it } from "vitest";
import {
  getNextDailyRun,
  getNextHourlyRun,
  normalizeTimeZone,
} from "../server/utils/schedule";

describe("scheduler time calculations", () => {
  it("schedules the next UTC hourly boundary", () => {
    const next = getNextHourlyRun(
      new Date("2026-05-07T10:15:30.000Z"),
      "UTC",
    );

    expect(next.toISOString()).toBe("2026-05-07T11:00:00.000Z");
  });

  it("respects time zones with non-hour offsets", () => {
    const next = getNextHourlyRun(
      new Date("2026-05-07T00:20:00.000Z"),
      "Asia/Kathmandu",
    );

    expect(next.toISOString()).toBe("2026-05-07T01:15:00.000Z");
  });

  it("schedules the next daily run in the configured time zone", () => {
    const beforeDailyRun = getNextDailyRun(
      new Date("2026-05-06T23:00:00.000Z"),
      "Asia/Shanghai",
      8,
      0,
    );
    const afterDailyRun = getNextDailyRun(
      new Date("2026-05-07T00:01:00.000Z"),
      "Asia/Shanghai",
      8,
      0,
    );

    expect(beforeDailyRun.toISOString()).toBe("2026-05-07T00:00:00.000Z");
    expect(afterDailyRun.toISOString()).toBe("2026-05-08T00:00:00.000Z");
  });

  it("falls back to UTC for invalid time zones", () => {
    expect(normalizeTimeZone("not/a-zone")).toBe("UTC");
  });
});
