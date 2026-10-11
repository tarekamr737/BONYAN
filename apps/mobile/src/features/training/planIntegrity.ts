import { phrase } from "../../core/i18n/copy";
import type { WorkoutPlan } from "./types";

export function planNeedsRefresh(plan: Pick<WorkoutPlan, "days"> | null | undefined): boolean {
  return plan?.days.some(day => day.prescriptions.some(item => item.exercise_id.startsWith("fallback-"))) ?? false;
}

export function planRefreshMessage(arabic: boolean): string {
  return phrase("copy_558be62e39dc", arabic);
}

export function planGenerationError(code: string | undefined, arabic: boolean): string {
  if (code === "training_catalog_no_match") return phrase("copy_3881a2b25747", arabic);
  return phrase("copy_878559103853", arabic);
}
