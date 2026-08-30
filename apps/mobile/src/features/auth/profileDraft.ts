import type {
  ExperienceLevel,
  PreferredUnits,
  ProfileUpdate,
  TrainingGoal,
  UserProfile,
} from "./types";

export type ProfileDraft = {
  availableEquipment: string[];
  availableTrainingDays: number;
  dateOfBirth: string;
  displayName: string;
  experienceLevel: ExperienceLevel;
  heightCm: string;
  preferredLanguage: string;
  preferredUnits: PreferredUnits;
  sex: "female" | "male" | "unspecified";
  timezone: string;
  trainingGoal: TrainingGoal;
};

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function profileToDraft(profile?: UserProfile): ProfileDraft {
  return {
    availableEquipment: profile?.available_equipment.length
      ? profile.available_equipment
      : ["bodyweight"],
    availableTrainingDays: profile?.available_training_days ?? 3,
    dateOfBirth: profile?.date_of_birth ?? "",
    displayName: profile?.display_name ?? "",
    experienceLevel: profile?.experience_level ?? "beginner",
    heightCm: profile?.height_cm ?? "",
    preferredLanguage: profile?.preferred_language ?? "en",
    preferredUnits: profile?.preferred_units ?? "metric",
    sex: profile?.sex ?? "unspecified",
    timezone: profile?.timezone || deviceTimezone(),
    trainingGoal: profile?.training_goal ?? "general_fitness",
  };
}

export function validateProfileDraft(draft: ProfileDraft): string | null {
  const normalizedName = draft.displayName.trim().replace(/\s+/g, " ");
  if (!normalizedName) {
    return "Enter the name you want BONYAN to use.";
  }
  if (normalizedName.length > 120) {
    return "Display name must be 120 characters or fewer.";
  }
  if (draft.availableEquipment.length === 0) {
    return "Choose at least one equipment option. Select bodyweight if you train without equipment.";
  }
  if (draft.heightCm) {
    const height = Number(draft.heightCm);
    if (!Number.isFinite(height) || height < 80 || height > 250) {
      return "Height must be between 80 and 250 cm.";
    }
  }
  if (draft.dateOfBirth) {
    const dateOfBirth = new Date(`${draft.dateOfBirth}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.dateOfBirth) ||
      Number.isNaN(dateOfBirth.getTime()) ||
      dateOfBirth.toISOString().slice(0, 10) !== draft.dateOfBirth ||
      dateOfBirth > new Date()
    ) {
      return "Enter a valid date of birth in YYYY-MM-DD format.";
    }
  }
  return null;
}

export function profileDraftToUpdate(
  draft: ProfileDraft,
  onboardingCompleted: boolean,
): ProfileUpdate {
  return {
    available_equipment: [...new Set(draft.availableEquipment)].sort(),
    available_training_days: draft.availableTrainingDays,
    date_of_birth: draft.dateOfBirth || null,
    display_name: draft.displayName.trim().replace(/\s+/g, " "),
    experience_level: draft.experienceLevel,
    height_cm: draft.heightCm || null,
    onboarding_completed: onboardingCompleted,
    preferred_language: draft.preferredLanguage,
    preferred_units: draft.preferredUnits,
    sex: draft.sex,
    timezone: draft.timezone,
    training_goal: draft.trainingGoal,
  };
}
