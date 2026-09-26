import { describe, expect, it } from "vitest";
import { planGenerationError, planNeedsRefresh, planRefreshMessage } from "../src/features/training/planIntegrity";
import type { WorkoutDay } from "../src/features/training/types";

function day(exerciseId: string): WorkoutDay {
  return { key: "day-1", order: 1, name: "Push", estimated_minutes: 40, prescriptions: [{
    exercise_id: exerciseId, name: "Press", muscles: ["chest"], equipment: ["bodyweight"],
    sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, intensity_target: null, notes: null,
    progression: {type: "double_progression", increment_kg: 2.5, hold_after_failures: 1, regress_after_failures: 2},
  }] };
}

describe("training plan integrity", () => {
  it("detects placeholders anywhere in a saved plan", () => {
    expect(planNeedsRefresh({days: [day("real-id"), day("fallback-chest")]})).toBe(true);
    expect(planNeedsRefresh({days: [day("real-id")]})).toBe(false);
    expect(planNeedsRefresh(null)).toBe(false);
    expect(planNeedsRefresh(undefined)).toBe(false);
  });
  it("explains recovery and preservation of history in both languages", () => {
    expect(planRefreshMessage(false)).toContain("history is preserved");
    expect(planRefreshMessage(true)).toContain("محفوظ");
    expect(planGenerationError("training_catalog_no_match", false)).toContain("equipment");
    expect(planGenerationError("training_catalog_no_match", true)).toContain("معدات");
    expect(planGenerationError("exercise_provider_rate_limited", false)).toContain("retry");
    expect(planGenerationError(undefined, true)).toContain("جرّب تاني");
  });
});
