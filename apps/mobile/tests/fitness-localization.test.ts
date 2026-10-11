import {describe, expect, it} from "vitest";
import {fitnessLabel, weightFromKg, weightLabel, weightToKg} from "../src/core/i18n/fitness";
import {ApiError} from "../src/core/api/errors";
import {normalizeNumerals, parseLocalizedNumber, setCurrentLocale, translate} from "../src/core/i18n/messages";

describe("localized workout input and private errors", () => {
  it("converts display pounds without changing the canonical kg log", () => {
    const pounds = weightFromKg(50, true);
    expect(pounds).toBeCloseTo(110.231);
    expect(weightToKg(pounds, true)).toBeCloseTo(50);
    expect(weightLabel(50, "ar-EG", true)).toContain(translate("pound", "ar-EG"));
  });
  it("accepts Egyptian and Persian numerals without treating blank input as zero", () => {
    expect(parseLocalizedNumber("٨٢٫٥")).toBe(82.5);
    expect(parseLocalizedNumber("۱٬۲۳۴٫۵")).toBe(1234.5);
    expect(normalizeNumerals("٠١٢٣٤٥")).toBe("012345");
    expect(parseLocalizedNumber(" ")).toBeNaN();
    expect(parseLocalizedNumber("٨٠oops")).toBeNaN();
  });
  it("keeps unknown catalog metadata localized in Arabic", () => {
    expect(fitnessLabel("unknown_vendor_equipment", "ar-EG", "equipment")).toBe(translate("otherEquipment", "ar-EG"));
    expect(fitnessLabel("chest", "ar-EG")).toBe("الصدر");
  });
  it.each(["en", "ar-EG"] as const)("never renders provider payloads in %s", locale => {
    setCurrentLocale(locale);
    expect(new ApiError(502, "provider_internal_error", "PRIVATE BODY DATA").message).toBe(translate("request_failed", locale));
    setCurrentLocale("en");
  });
});
