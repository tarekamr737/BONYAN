import { describe, expect, it } from "vitest";

import { buildAppNotifications, getAvatarJourney } from "../src/core/notifications/appNotifications";
import type { AssessmentOverview, UserProfile } from "../src/features/auth/types";
import type { AvatarView } from "../src/features/avatar/types";

const profile: UserProfile = {
  available_equipment: ["bodyweight"],
  available_training_days: 3,
  coaching: {},
  created_at: null,
  date_of_birth: null,
  display_name: "Sami",
  experience_level: "beginner",
  has_profile_photo: false,
  height_cm: "178",
  onboarding_completed: true,
  preferred_language: "en",
  preferred_units: "metric",
  profile_photo_updated_at: null,
  sex: "male",
  timezone: "Africa/Cairo",
  training_goal: "general_fitness",
  updated_at: null,
};

const assessment: AssessmentOverview = {
  completion: 70,
  latest: {
    created_at: "2026-09-15T08:00:00Z",
    id: "assessment-1",
    kind: "manual_assessment",
    snapshot: { measurements: { height_cm: 178, weight_kg: 80 }, source: "manual" },
  },
  missing_profile: ["fitness_level"],
  score: { coverage: 50, dimensions: [], improve: null, missing: [], recommendation: "Add more data.", strongest: null, value: 62, version: "v1" },
};

const avatar: AvatarView = {
  approved: false,
  created_at: "2026-09-15T08:00:00Z",
  failure_code: null,
  id: "avatar-1",
  measurement_source: "manual",
  measurements_recorded_at: "2026-09-15T08:00:00Z",
  presentation: "men",
  preview_url: "https://example.test/avatar.png",
  public_in_community: false,
  shape_profile: "fit",
  state: "ready_for_review",
  style: "cinematic_3d",
  updated_at: "2026-09-15T08:00:00Z",
};

describe("app notifications", () => {
  it("prioritizes real actions from profile, plan and avatar state", () => {
    const items = buildAppNotifications({ arabic: false, assessment, avatars: { items: [avatar] }, plan: null, profile });
    expect(items.slice(0, 3).map((item) => item.id)).toEqual(["profile_completion", "plan_missing", "avatar_review"]);
    expect(items.filter((item) => item.requiresAction)).toHaveLength(3);
  });

  it("describes the next truthful avatar milestone", () => {
    expect(getAvatarJourney(undefined, false, false).progress).toBe(15);
    expect(getAvatarJourney(undefined, true, false).progress).toBe(45);
    expect(getAvatarJourney(avatar, true, false)).toMatchObject({ progress: 88, status: "Version ready to review" });
    expect(getAvatarJourney({ ...avatar, approved: true, state: "approved" }, true, true).progress).toBe(100);
  });
});
