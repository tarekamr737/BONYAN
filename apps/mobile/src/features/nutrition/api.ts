import { apiRequest } from "../../core/api/client";
import type { DailyDashboard, FoodLog, MealType } from "./types";

export function getDailyDashboard(): Promise<DailyDashboard> {
  return apiRequest("/api/v1/nutrition/today");
}

export function getTodayFoodLogs(): Promise<FoodLog[]> {
  return apiRequest("/api/v1/nutrition/logs/today");
}

export function analyzeFood(description: string, mealType: MealType): Promise<FoodLog> {
  return apiRequest("/api/v1/nutrition/analyze", {
    body: { description, meal_type: mealType },
    method: "POST",
  });
}

export type FoodPreview = Pick<FoodLog, "calories" | "protein_g" | "carbs_g" | "fat_g" | "summary"> & {request_id: string};
export function previewFood(description: string, mealType: MealType): Promise<FoodPreview> {
  return apiRequest("/api/v1/nutrition/preview", {method: "POST", body: {description, meal_type: mealType}});
}
export function confirmFood(preview: FoodPreview, description: string, mealType: MealType): Promise<FoodLog> {
  return apiRequest("/api/v1/nutrition/confirm", {method: "POST", body: {...preview, description, meal_type: mealType}});
}
