import type { WorkoutPlan } from "./types";

export function planNeedsRefresh(plan: Pick<WorkoutPlan, "days"> | null | undefined): boolean {
  return plan?.days.some(day => day.prescriptions.some(item => item.exercise_id.startsWith("fallback-"))) ?? false;
}

export function planRefreshMessage(arabic: boolean): string {
  return arabic
    ? "الخطة القديمة فيها تمارين مش متاحة. جهّز خطة جديدة واعتمدها عشان تكمل. سجل تمريناتك محفوظ."
    : "This older plan contains unavailable exercises. Prepare and approve a new plan to continue. Your workout history is preserved.";
}

export function planGenerationError(code: string | undefined, arabic: boolean): string {
  if (code === "training_catalog_no_match") return arabic
    ? "مفيش تمارين مناسبة للمعدات دي في الكتالوج دلوقتي. راجع معداتك في ملفك أو اختار التمارين يدويًا. خطتك الحالية ما اتغيرتش."
    : "No catalog exercises match your equipment. Review your profile equipment or choose exercises manually. Your current plan has not changed.";
  return arabic
    ? "كتالوج التمارين مش متاح دلوقتي. استنى شوية وجرّب تاني. خطتك الحالية ما اتغيرتش."
    : "The exercise catalog is unavailable right now. Wait a moment and retry. Your current plan has not changed.";
}
