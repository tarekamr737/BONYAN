import { describe, expect, it } from "vitest";

import { coachMatchesLocale, readableCoachText } from "../src/features/training/coachText";

describe("readableCoachText", () => {
  it("removes provider markdown while retaining readable Arabic structure", () => {
    expect(
      readableCoachText("## خطتك الحالية\n- **الهدف:** قوة\n- [التمرين](https://example.com)\n\n\n`ملاحظة`"),
    ).toBe("خطتك الحالية\n• الهدف: قوة\n• التمرين\n\nملاحظة");
  });
});

it("keeps earlier Coach replies in a different language out of the current localized flow", () => {
  expect(coachMatchesLocale("راجع تمرين Chest Press واختار وزن مناسب ليك", true)).toBe(true);
  expect(coachMatchesLocale("This reply uses English", true)).toBe(false);
  expect(coachMatchesLocale("راجع تمرينك", false)).toBe(false);
  expect(coachMatchesLocale("Review your workout", false)).toBe(true);
});
