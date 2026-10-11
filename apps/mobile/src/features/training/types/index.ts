export type TrainingGoal = "strength" | "hypertrophy" | "fat_loss" | "general_fitness" | "military_preparation";
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
  exercise_id: string;
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

export type ExerciseMediaAccess = {
  url: string;
  expires_at: string | null;
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
  logged_at?: string | null;
  id?: string | null;
  exercise_id?: string | null;
  exercise_name?: string | null;
};

export type WorkoutSession = {
  id: string;
  version: number;
  prescription_snapshot: WorkoutDay | null;
  plan_id: string;
  day_key: string;
  status: WorkoutSessionStatus;
  started_at: string;
  completed_at: string | null;
  logged_sets: LoggedSet[];
  summary: Record<string, unknown>;
};

export type SubstitutionScope = "session" | "plan" | "equipment";
export type SubstitutionReason = "busy_today" | "not_available";
export type SessionSubstitution = {
  id: string; session_id: string; prescription_index: number; expected_version: number;
  scope: SubstitutionScope; reason: SubstitutionReason; status: string;
  original: ExercisePrescription; candidate: ExercisePrescription; expires_at: string;
  media_available: boolean; remaining_sets: number;
};
export type SubstitutionResult = {
  session: WorkoutSession; event_id: string; plan_revision_id: string | null; equipment_changed: boolean;
};

export type CoachMessageResponse = {
  response: string;
  model: string;
  tool_results: Record<string, unknown>[];
};

export type CoachMessage = {
  id: string;
  role: "user" | "coach";
  content: string;
  model: string | null;
  created_at: string;
};

export type CoachToolCall = {
  name:
    | "get_current_plan"
    | "get_training_history"
    | "search_exercises"
    | "get_exercise_details"
    | "generate_workout_plan"
    | "log_workout";
  arguments?: Record<string, unknown>;
};

export type ExerciseSearchItem = {
  id: string;
  name: string;
  muscles: string[];
  equipment: string[];
  difficulty: string;
  instructions?: string[];
  translated_name?: string | null;
  translated_instructions?: string[];
};

export type ExerciseSearchResponse = {
  items: ExerciseSearchItem[];
  page: number;
  page_size: number;
  total: number | null;
  next_page: number | null;
};

export type ManualPlanRequest = {
  name: string;
  goal: TrainingGoal;
  experience: ExperienceLevel;
  exercises: {
    exercise_id: string;
    sets: number;
    reps_min: number;
    reps_max: number;
    rest_seconds: number;
  }[];
  activate: boolean;
};
