import {describe, expect, it} from "vitest";
import {exerciseCount, fitnessLabel, weightFromKg, weightLabel, weightToKg} from "../src/core/i18n/fitness";
import {ApiError} from "../src/core/api/errors";
import {normalizeNumerals, parseLocalizedNumber, setCurrentLocale, translate} from "../src/core/i18n/messages";
import {measurementLabel, measurementUnit, reviewFlag} from "../src/core/i18n/measurements";
import {mealLabel, macroLabel, narrativeMatchesLocale} from "../src/core/i18n/nutrition";
import {profileToDraft, profileDraftToUpdate, validateProfileDraft} from "../src/features/auth/profileDraft";

describe("localized workout input and private errors", () => {
  it("uses Egyptian singular, dual and plural exercise counts", () => {
    expect(exerciseCount(1, "ar-EG")).toBe("تمرين واحد");
    expect(exerciseCount(2, "ar-EG")).toBe("تمرينين");
    expect(exerciseCount(3, "ar-EG")).toBe("٣ تمارين");
    expect(exerciseCount(1, "en")).toBe("1 exercise");
  });
  it("localizes measurement and nutrition labels without English fallback", () => {
    for (const label of [measurementLabel("weight", true), measurementUnit("kg", "ar-EG"), reviewFlag("low_confidence", true), mealLabel("breakfast", "ar-EG"), macroLabel("protein_g", "ar-EG")]) expect(/[\u0600-\u06ff]/.test(label)).toBe(true);
    expect(reviewFlag("vendor_unknown", true)).toBe(translate("unknown", "ar-EG"));
    expect(narrativeMatchesLocale("Your provider response", "ar-EG")).toBe(false);
    expect(narrativeMatchesLocale("دي تقديرات، راجع الكميات", "ar-EG")).toBe(true);
    expect(narrativeMatchesLocale("دي تقديرات", "en")).toBe(false);
  });
  it("accepts Arabic birth dates and keeps Arabic validation localized", () => {
    const draft = {...profileToDraft(), preferredLanguage: "ar-EG", displayName: "طارق", dateOfBirth: "١٩٩٨-٠١-٠٢", heightCm: "١٧٨"};
    expect(validateProfileDraft(draft)).toBeNull();
    expect(profileDraftToUpdate(draft, true)).toMatchObject({date_of_birth: "1998-01-02", height_cm: "178"});
    expect(validateProfileDraft({...draft, displayName: ""})).toBe(translate("profileNameRequired", "ar-EG"));
  });
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
