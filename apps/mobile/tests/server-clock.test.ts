import {describe, expect, it, vi} from "vitest";
import {remainingDaysLabel} from "../src/core/i18n/messages";
import {estimatedServerTime, recordServerTime} from "../src/core/api/serverClock";
describe("server-derived workout timer", () => {
  it("localizes season countdowns against server time without device clock assumptions", () => {
    const now = Date.parse("2026-10-11T00:00:00Z");
    expect(remainingDaysLabel("2026-10-13T00:00:00Z", now, "ar-EG")).toBe("فاضل يومين");
    expect(remainingDaysLabel("2026-10-12T00:00:00Z", now, "en")).toBe("1 day left");
    expect(remainingDaysLabel("2026-10-10T00:00:00Z", now, "en")).toBe("Ended");
    expect(remainingDaysLabel("2026-10-13", null, "en")).toBe("Unknown");
  });
  it("advances monotonically despite a wrong device date or clock changes", () => {
    recordServerTime("2026-10-11T20:00:00Z", 100);
    const before = estimatedServerTime(1100);
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2099-01-01"));
    expect(estimatedServerTime(1100)).toBe(before);
    expect(estimatedServerTime(3100)).toBe(before! + 2000);
    vi.restoreAllMocks();
  });
  it("ignores malformed provider timestamps and clamps monotonic rollback", () => {
    recordServerTime("2026-10-11T20:00:00Z", 100);
    const valid = estimatedServerTime(100);
    recordServerTime("invalid", 999);
    expect(estimatedServerTime(50)).toBe(valid);
  });
});
