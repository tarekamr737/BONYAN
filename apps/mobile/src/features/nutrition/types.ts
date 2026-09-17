export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodLog = {
  id: string;
  description: string;
  meal_type: MealType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  summary: string;
  source: string;
  logged_at: string;
};

export type DailyScoreComponent = {
  key: "training" | "nutrition";
  value: number;
  maximum: number;
  detail: string;
};

export type DailyDashboard = {
  date: string;
  score: number;
  completed_workouts: number;
  active_workouts: number;
  meals_logged: number;
  calories_logged: number;
  components: DailyScoreComponent[];
  next_action: string;
};
