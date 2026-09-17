import { describe, expect, it } from "vitest";

import { readableCoachText } from "../src/features/training/coachText";

describe("readableCoachText", () => {
  it("removes provider markdown while retaining readable Arabic structure", () => {
    expect(
      readableCoachText("## خطتك الحالية\n- **الهدف:** قوة\n- [التمرين](https://example.com)\n\n\n`ملاحظة`"),
    ).toBe("خطتك الحالية\n• الهدف: قوة\n• التمرين\n\nملاحظة");
  });
});
