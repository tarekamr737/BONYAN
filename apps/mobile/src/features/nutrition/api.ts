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
