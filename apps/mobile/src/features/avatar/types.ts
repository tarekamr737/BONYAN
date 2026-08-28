export type AvatarState =
  | "requested"
  | "processing"
  | "ready_for_review"
  | "approved"
  | "rejected"
  | "failed";

export type AvatarView = {
  id: string;
  state: AvatarState;
  style: string;
  presentation: AvatarPresentation;
  shape_profile: BodyShapeProfile;
  preview_url: string | null;
  approved: boolean;
  public_in_community: boolean;
  failure_code: string | null;
  measurement_source: string;
  measurements_recorded_at: string;
  created_at: string;
  updated_at: string;
};

export type AvatarListView = {
  items: AvatarView[];
};

export type AvatarMeasurementStatus = {
  available: boolean;
  source: string | null;
  recorded_at: string | null;
  body_fat_available: boolean;
  muscle_mass_available: boolean;
  shape_profile: BodyShapeProfile | null;
};

export type ManualBodyMeasurementsPayload = {
  height_cm: number;
  weight_kg: number;
  body_fat_percentage: number | null;
  skeletal_muscle_mass_kg: number | null;
};

export type CreateAvatarPayload = {
  style: "cinematic_3d";
  presentation: AvatarPresentation;
};

export type AvatarPresentation = "men" | "women";
export type BodyShapeProfile = "skinny" | "slim" | "normal" | "fit" | "strong" | "full";
