import {describe, expect, it} from "vitest";
import {nextWorkout, progressChange} from "../src/core/screens/todayState";
import type {WorkoutPlan, WorkoutSession} from "../src/features/training/types";
import type {ProgressHistory, ProgressScore} from "../src/features/game/api";
import {visibleProgressValue} from "../src/features/game/progress";

const days = [{key: "a", order: 0}, {key: "b", order: 1}] as WorkoutPlan["days"];
const plan = {id: "new", status: "active", days: [...days].reverse()} as WorkoutPlan;
describe("Today authoritative workout state", () => {
  it("resumes the canonical changed session even after its source plan is archived", () => {
    const session = {id: "session", plan_id: "old", status: "active", prescription_snapshot: {key: "changed"}} as WorkoutSession;
    expect(nextWorkout(plan, [session]).day?.key).toBe("changed");
    expect(nextWorkout(null, [session]).active?.id).toBe("session");
  });
  it("advances only from this plan's latest completed day and wraps", () => {
    const completed = {plan_id: "new", status: "completed", day_key: "a", completed_at: "2026-10-10T10:00:00Z"} as WorkoutSession;
    const old = {...completed, plan_id: "old", day_key: "b", completed_at: "2026-10-11T10:00:00Z"};
    expect(nextWorkout(plan, [old, completed]).day?.key).toBe("b");
    expect(nextWorkout(plan, [{...completed, day_key: "b"}]).day?.key).toBe("a");
    expect(nextWorkout({...plan, status: "draft"}, []).day).toBeNull();
  });
});
it("does not invent a progress trend from unknown or incomparable evidence", () => {
  const score = {value: 75, ranked: true, coverage: 80, version: "v1", dimensions: {training: 80}} as unknown as ProgressScore;
  expect(visibleProgressValue({...score, ranked: false, coverage: 35})).toBeNull();
  expect(progressChange({...score, ranked: false}, [])).toBeNull();
  const history = [{result: {...score, value: 60, coverage: 60}}, {result: {...score, version: "v0", value: 50}}] as ProgressHistory[];
  expect(progressChange(score, history)).toBeNull();
  expect(progressChange({...score, value: null}, history)).toBeNull();
  expect(progressChange(score, [{id: "before", created_at: "2026-10-10T10:00:00Z", result: {...score, value: 70, dimensions: {training: 70}}}])).toBe(5);
});
