import { describe, expect, it } from "vitest";
import { cleanCoaching, goalLabel, journeySteps, performanceFields } from "../src/features/auth/journey";
import { coachingCopy } from "../src/features/auth/coachingCopy";

describe("connected coaching journey", () => {
  it("adds military preparation without removing the existing goals", () => {
    for (const goal of ["strength", "hypertrophy", "fat_loss", "general_fitness", "military_preparation"] as const) {
      expect(journeySteps(goal)).toContain("body");
      expect(journeySteps(goal).at(-1)).toBe("summary");
    }
    expect(journeySteps("military_preparation")).toContain("military");
    expect(journeySteps("strength")).not.toContain("military");
  });
  it("asks for relevant performance while preserving shared answers on a goal change", () => {
    expect(performanceFields("strength").running).toBe(false);
    expect(performanceFields("military_preparation").pullups).toBe(true);
    expect(performanceFields("military_preparation").situps).toBe(true);
    const updated = cleanCoaching("general_fitness", {military_subtype: "other", situps: 20, pullups: 4, limitations: "knee", active_days_per_week: 3, running_minutes: 12, target_weight_kg: 70});
    expect(updated).toMatchObject({military_subtype: null, situps: null, pullups: null, limitations: null, target_weight_kg: null, active_days_per_week: 3, running_minutes: 12});
  });
  it("provides real Arabic goal and measurement labels", () => {
    expect(goalLabel("military_preparation", true)).toMatch(/[\u0600-\u06ff]/);
    expect(coachingCopy("weight_kg", true)).toMatch(/[\u0600-\u06ff]/);
    expect(goalLabel("strength", true)).not.toContain("?");
  });
});
