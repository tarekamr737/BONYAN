import type { CoachingPreferences, TrainingGoal } from "./types";

export const goalOptions = [
 {value: "general_fitness", title: "Feel fitter every day", ar: "تحسين اللياقة العامة", description: "Build energy and a routine that lasts.", descriptionAr: "ابنِ نشاطك وروتينًا تقدر تستمر عليه.", icon: "activity"},
 {value: "strength", title: "Build strength", ar: "زيادة القوة", description: "Get stronger with purposeful practice.", descriptionAr: "طوّر قوتك بتدريب منتظم وهادف.", icon: "trending-up"},
 {value: "hypertrophy", title: "Build muscle", ar: "بناء العضلات", description: "Train consistently for muscle growth.", descriptionAr: "انتظم في التدريب لبناء العضلات.", icon: "layers"},
 {value: "fat_loss", title: "Lose fat", ar: "خسارة الدهون", description: "Follow your measurements and stay active.", descriptionAr: "تابع قياساتك وحافظ على نشاطك.", icon: "target"},
 {value: "military_preparation", title: "Military College Preparation", ar: "الاستعداد للكليات العسكرية", description: "Develop strength endurance and track your own targets.", descriptionAr: "طوّر تحمّلك العضلي وتابع أهدافك الشخصية.", icon: "shield"},
] as const;
export type JourneyStep = "welcome" | "name" | "goal" | "military" | "focus" | "body" | "experience" | "performance" | "schedule" | "summary";
export function journeySteps(goal: TrainingGoal): JourneyStep[] {
 return ["welcome", "name", "goal", ...(goal === "military_preparation" ? ["military" as const] : ["focus" as const]), "body", "experience", "schedule", "performance", "summary"];
}
export function performanceFields(goal: TrainingGoal) {
 return {running: ["general_fitness", "fat_loss", "military_preparation"].includes(goal), pushups: ["strength", "hypertrophy", "military_preparation"].includes(goal), pullups: goal === "military_preparation", weightTarget: goal === "fat_loss"};
}
export function cleanCoaching(goal: TrainingGoal, value: CoachingPreferences): CoachingPreferences {
 return {...value, ...(goal !== "military_preparation" ? {military_subtype: null, target_date: null, pullups: null, pullups_target: null} : {}), ...(goal !== "fat_loss" ? {target_weight_kg: null} : {})};
}
export const dimensionLabel: Record<string, string> = {strength: "Push-up target", endurance: "Running target", pullups: "Pull-up target", consistency: "Weekly consistency", body_goal: "Weight target progress"};
export function goalLabel(goal: TrainingGoal | null | undefined, arabic = false) { const option = goalOptions.find(item => item.value === goal); return option ? arabic ? option.ar : option.title : arabic ? "اختر هدفك" : "Choose your goal"; }
