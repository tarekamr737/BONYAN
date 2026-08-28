export type TrainingGoal = "strength" | "hypertrophy" | "fat_loss" | "general_fitness";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type PlanStatus = "draft" | "active" | "archived";
export type WorkoutSessionStatus = "active" | "completed";

export type ProgressionRule = {
  type: string;
  increment_kg: number;
  hold_after_failures: number;
  regress_after_failures: number;
};

export type ExercisePrescription = {
  musclewiki_id: string;
  name: string;
  muscles: string[];
  equipment: string[];
  sets: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  intensity_target: string | null;
  notes: string | null;
  progression: ProgressionRule;
};

export type WorkoutDay = {
  key: string;
  order: number;
  name: string;
  estimated_minutes: number;
  prescriptions: ExercisePrescription[];
};

export type WorkoutPlan = {
  id: string;
  status: PlanStatus;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  days_per_week: number;
  session_duration_minutes: number;
  equipment: string[];
  generation_snapshot: Record<string, unknown>;
  days: WorkoutDay[];
  created_at: string | null;
  updated_at: string | null;
};

export type GeneratePlanRequest = {
  goal: TrainingGoal;
  experience: ExperienceLevel;
  days_per_week: number;
  session_duration_minutes: number;
  equipment: string[];
  activate: boolean;
};

export type LoggedSetInput = {
  prescription_index: number;
  set_number: number;
  reps: number;
  weight_kg: number;
  completed: boolean;
  notes?: string | null;
};

export type LoggedSet = LoggedSetInput & {
  id?: string | null;
  exercise_name?: string | null;
};

export type WorkoutSession = {
  id: string;
  plan_id: string;
  day_key: string;
  status: WorkoutSessionStatus;
  started_at: string;
  completed_at: string | null;
  logged_sets: LoggedSet[];
  summary: Record<string, unknown>;
};

export type CoachMessageResponse = {
  response: string;
  model: string;
  tool_results: Record<string, unknown>[];
};
