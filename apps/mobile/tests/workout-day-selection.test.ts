import { describe, expect, it } from "vitest";

import { selectWorkoutDay } from "../src/features/training/selectWorkoutDay";
import type { WorkoutDay } from "../src/features/training/types";

const days = [
  { key: "upper", order: 2, name: "Upper", estimated_minutes: 45, prescriptions: [] },
  { key: "lower", order: 1, name: "Lower", estimated_minutes: 45, prescriptions: [] },
] satisfies WorkoutDay[];

describe("workout day selection", () => {
  it("opens the first scheduled day when no day was requested", () => {
    expect(selectWorkoutDay(days, undefined)?.key).toBe("lower");
  });

  it("does not silently open another day for a broken link", () => {
    expect(selectWorkoutDay(days, "missing")).toBeUndefined();
  });

  it("uses the saved session day when a link contains a different day", () => {
    expect(selectWorkoutDay(days, "upper", "lower")?.key).toBe("lower");
  });
});
