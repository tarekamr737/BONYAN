import { describe, expect, it } from "vitest";

import { buildAppNotifications, getAvatarJourney } from "../src/core/notifications/appNotifications";
import type { AssessmentOverview, UserProfile } from "../src/features/auth/types";
import type { AvatarView } from "../src/features/avatar/types";
import type { WorkoutPlan } from "../src/features/training/types";

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
  home_tour_completed: false,
  home_tour_completed_at: null,
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

  it("does not describe a one-day manual workout as the user's weekly plan", () => {
    const manualPlan: WorkoutPlan = {
      id: "manual-plan-1",
      status: "active",
      goal: "general_fitness",
      experience: "beginner",
      days_per_week: 1,
      session_duration_minutes: 30,
      equipment: ["bodyweight"],
      generation_snapshot: { source: "manual" },
      days: [],
      created_at: null,
      updated_at: null,
    };
    const item = buildAppNotifications({ arabic: false, plan: manualPlan, profile }).find(
      (notification) => notification.id === "plan_missing",
    );
    expect(item).toMatchObject({ requiresAction: true, title: "Your weekly plan is not ready yet" });
    expect(item?.body).toContain("3-day weekly plan");
  });

  it("prompts a private portrait refresh after a newer confirmed assessment", () => {
    const approved = {
      ...avatar,
      approved: true,
      state: "approved" as const,
      measurements_recorded_at: "2026-09-01T08:00:00Z",
    };
    const items = buildAppNotifications({
      arabic: false, assessment, avatars: { items: [approved] }, plan: null, profile,
    });
    expect(items.find((item) => item.id === "avatar_refresh")).toMatchObject({
      requiresAction: true,
      href: "/avatar",
    });
  });
});
