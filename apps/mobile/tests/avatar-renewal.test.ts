import { describe, expect, it } from "vitest";

import { avatarRenewalStatus } from "../src/features/avatar/renewal";

describe("avatar renewal", () => {
  const now = Date.parse("2026-09-16T12:00:00Z");

  it("prompts a new private version when confirmed measurements changed", () => {
    expect(avatarRenewalStatus("2026-09-01T00:00:00Z", "2026-09-15T00:00:00Z", now)).toBe("new_measurements");
  });

  it("prompts reassessment after sixty days without fresh body data", () => {
    expect(avatarRenewalStatus("2026-07-01T00:00:00Z", "2026-07-01T00:00:00Z", now)).toBe("reassessment_due");
  });

  it("leaves a recent portrait current and tolerates unavailable timestamps", () => {
    expect(avatarRenewalStatus("2026-09-01T00:00:00Z", null, now)).toBe("current");
    expect(avatarRenewalStatus("invalid", null, now)).toBe("current");
  });
});
