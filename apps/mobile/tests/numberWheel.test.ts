import {describe, expect, it} from "vitest";
import {parseSetValue, wheelIndex, wheelValues} from "../src/features/training/numberWheel";
import {weightFromKg, weightToKg} from "../src/core/i18n/fitness";

describe("workout wheel selection", () => {
  it("preserves exact non-step weights instead of silently rounding", () => {
    const values = wheelValues(0, 300, 2.5, 1.25);
    expect(values.slice(0, 3)).toEqual([0, 1.25, 2.5]);
    expect(values.at(-1)).toBe(300);
    expect(new Set(values).size).toBe(values.length);
  });
  it("bounds gestures and handles overscroll", () => {
    expect(wheelIndex(-44, 44, 51)).toBe(0);
    expect(wheelIndex(66, 44, 51)).toBe(2);
    expect(wheelIndex(9000, 44, 51)).toBe(50);
    expect(wheelIndex(NaN, 44, 51)).toBe(0);
  });
  it("rejects malformed or huge datasets", () => {
    expect(() => wheelValues(0, 100, 0, 10)).toThrow();
    expect(() => wheelValues(0, 10000, 1, 10)).toThrow();
    expect(wheelValues(0, 50, 1, NaN)).toHaveLength(51);
  });
  it("accepts Egyptian Arabic decimals and bodyweight zero", () => {
    expect(parseSetValue("١٫٢٥", 0, 300, false)).toBe(1.25);
    expect(parseSetValue("0", 0, 300, false)).toBe(0);
    for (const text of ["", "-1", "301", "NaN", "1e2"]) expect(parseSetValue(text, 0, 300, false)).toBeNull();
    expect(parseSetValue("2.5", 0, 50, true)).toBeNull();
  });
  it("keeps pounds at the presentation boundary and kilograms in the log", () => {
    const kg = weightToKg(135, true);
    expect(weightFromKg(kg, true)).toBeCloseTo(135, 6);
    expect(kg).toBeCloseTo(61.23497, 4);
    expect(weightToKg(1.25, false)).toBe(1.25);
  });
});
