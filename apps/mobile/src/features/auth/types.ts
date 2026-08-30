export type TrainingGoal =
  | "strength"
  | "hypertrophy"
  | "fat_loss"
  | "general_fitness";
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

export type UserProfile = {
  available_equipment: string[];
  available_training_days: number | null;
  created_at: string | null;
  date_of_birth: string | null;
  display_name: string | null;
  experience_level: ExperienceLevel | null;
  height_cm: string | null;
  onboarding_completed: boolean;
  preferred_language: string;
  preferred_units: PreferredUnits;
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
    | "preferred_language"
    | "preferred_units"
    | "sex"
    | "timezone"
    | "training_goal"
  >
>;
