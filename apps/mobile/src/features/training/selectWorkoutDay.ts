import type { WorkoutDay } from "./types";

export function selectWorkoutDay(
  days: WorkoutDay[],
  routeDayKey: string | undefined,
  sessionDayKey?: string,
): WorkoutDay | undefined {
  const dayKey = sessionDayKey ?? routeDayKey;
  return dayKey
    ? days.find((day) => day.key === dayKey)
    : days.slice().sort((a, b) => a.order - b.order)[0];
}
