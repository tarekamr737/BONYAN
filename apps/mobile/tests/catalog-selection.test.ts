import {describe, expect, it} from "vitest";
import {toggleExerciseSelection} from "../src/features/training/catalogSelection";
import type {ExerciseSearchItem} from "../src/features/training/types";
const item = (id: string): ExerciseSearchItem => ({id, name: id, muscles: ["chest"], equipment: ["bodyweight"], difficulty: "beginner"});
describe("visual catalog selection across filters/pages", () => {
  it("preserves selected exercises when choosing a result on another page", () => {
    const first = item("one"); const selected = toggleExerciseSelection([first], item("two"));
    expect(selected.map(value => value.id)).toEqual(["one", "two"]);
    expect(first.id).toBe("one");
  });
  it("removes only the requested exercise and never duplicates an identity", () => {
    expect(toggleExerciseSelection([item("one"), item("two")], item("one")).map(value => value.id)).toEqual(["two"]);
  });
  it("keeps the server's twelve-exercise maximum, while removal still works at the cap", () => {
    const selected = Array.from({length: 12}, (_, index) => item(String(index)));
    expect(toggleExerciseSelection(selected, item("other"))).toBe(selected);
    expect(toggleExerciseSelection(selected, item("0"))).toHaveLength(11);
  });
});
