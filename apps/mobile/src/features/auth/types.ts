export type TrainingGoal =
  | "strength"
  | "hypertrophy"
  | "fat_loss"
  | "general_fitness" | "military_preparation";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type PreferredUnits = "metric" | "imperial";

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AccessTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: "bearer";
};

export type EmailRegistrationStarted = {
  challenge_id: string;
  expires_in: number;
};

export type UserProfile = {
  coaching?: CoachingPreferences;
  available_equipment: string[];
  available_training_days: number | null;
  created_at: string | null;
  date_of_birth: string | null;
  display_name: string | null;
  experience_level: ExperienceLevel | null;
  has_profile_photo: boolean;
  height_cm: string | null;
  onboarding_completed: boolean;
  home_tour_completed: boolean;
  home_tour_completed_at: string | null;
  preferred_language: string;
  preferred_units: PreferredUnits;
  profile_photo_updated_at: string | null;
  sex: "female" | "male" | "unspecified" | null;
  timezone: string;
  training_goal: TrainingGoal | null;
  updated_at: string | null;
};

export type ProfileUpdate = Partial<
  Pick<
    UserProfile,
    | "available_equipment"
    | "available_training_days"
    | "date_of_birth"
    | "display_name"
    | "experience_level"
    | "height_cm"
    | "onboarding_completed"
    | "home_tour_completed"
    | "preferred_language"
    | "preferred_units"
    | "sex"
    | "timezone"
    | "training_goal"
    | "coaching"
  >
>;

export type CoachingPreferences = {
  military_subtype?: "military_college" | "other" | "undecided" | null;
  target_date?: string | null;
  body_data_source?: "manual" | "inbody" | null;
  focus?: "consistency" | "endurance" | "strength" | "body_composition" | null;
  fitness_level?: "starting" | "building" | "established" | null;
  active_days_per_week?: number | null;
  running_minutes?: number | null;
  running_target_minutes?: number | null;
  pushups?: number | null;
  pushups_target?: number | null;
  pullups?: number | null;
  pullups_target?: number | null;
  target_weight_kg?: number | null;
};
export type Measurements = {height_cm: number | null; weight_kg: number | null; body_fat_percentage?: number | null; skeletal_muscle_mass_kg?: number | null};
export type CoachingScore = {value: number | null; coverage: number; version: string; dimensions: {key: string; value: number; weight: number; basis: string}[]; missing: string[]; strongest: string | null; improve: string | null; recommendation: string};
export type HistoryEntry = {id: string; kind: string; created_at: string; snapshot: {source?: "manual" | "inbody"; measurements?: Measurements; score?: CoachingScore; goal?: TrainingGoal; profile?: UserProfile; changed_fields?: string[]}};
export type AssessmentOverview = {score: CoachingScore; latest: HistoryEntry | null; completion: number; missing_profile: string[]};
