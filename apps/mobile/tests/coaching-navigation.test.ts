import { afterEach, describe, expect, it } from "vitest";
import { setSessionAccessToken } from "../src/core/auth/session";
import { shouldStepBack } from "../src/features/auth/journeyNavigation";

afterEach(() => setSessionAccessToken(null));

describe("questionnaire navigation", () => {
  it("revisits questions for authenticated Back actions", () => {
    setSessionAccessToken("test-session");
    expect(shouldStepBack(3, false, "GO_BACK")).toBe(true);
    expect(shouldStepBack(3, false, "POP")).toBe(true);
    expect(shouldStepBack(0, false)).toBe(false);
    expect(shouldStepBack(3, true)).toBe(false);
  });

  it("lets authentication and completion redirects replace the route", () => {
    setSessionAccessToken("test-session");
    expect(shouldStepBack(3, false, "REPLACE")).toBe(false);
    expect(shouldStepBack(3, false, "RESET")).toBe(false);
    setSessionAccessToken(null);
    expect(shouldStepBack(3, false, "GO_BACK")).toBe(false);
    expect(shouldStepBack(3, false, "POP")).toBe(false);
  });
});
