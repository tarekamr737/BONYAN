import type { WorkoutPlan, WorkoutSession } from "../../features/training/types";
import type { ProgressHistory, ProgressScore } from "../../features/game/api";

export function nextWorkout(plan: WorkoutPlan | null | undefined, sessions: WorkoutSession[]) {
  const active = sessions.find(session => session.status === "active");
  if (active) return {active, day: active.prescription_snapshot ?? null};
  if (!plan || plan.status !== "active") return {active: null, day: null};
  const days = [...plan.days].sort((a, b) => a.order - b.order);
  const latest = sessions.filter(session => session.status === "completed" && session.plan_id === plan.id)
    .sort((a, b) => Date.parse(b.completed_at ?? b.started_at) - Date.parse(a.completed_at ?? a.started_at))[0];
  const previousIndex = days.findIndex(day => day.key === latest?.day_key);
  return {active: null, day: days[(previousIndex + 1) % Math.max(1, days.length)] ?? null};
}

export function progressChange(current: ProgressScore, history: ProgressHistory[]): number | null {
  if (current.value === null) return null;
  const previous = history.find(item => item.result.value !== null && item.result.version === current.version
    && item.result.coverage === current.coverage && JSON.stringify(item.result.dimensions) !== JSON.stringify(current.dimensions));
  return previous?.result.value == null ? null : current.value - previous.result.value;
}
