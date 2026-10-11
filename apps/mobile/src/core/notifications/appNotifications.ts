import { phrase, phraseTemplate } from "../i18n/copy";
import type { AssessmentOverview, UserProfile } from "../../features/auth/types";
import type { AvatarListView, AvatarState, AvatarView } from "../../features/avatar/types";
import type { WorkoutPlan } from "../../features/training/types";
import { avatarRenewalStatus } from "../../features/avatar/renewal";

export type AppNotificationKind =
  | "avatar_build"
  | "avatar_failed"
  | "avatar_processing"
  | "avatar_ready"
  | "avatar_refresh"
  | "avatar_review"
  | "plan_missing"
  | "plan_ready"
  | "profile_completion"
  | "score_update";

export type AppNotification = {
  actionLabel: string;
  body: string;
  href: "/avatar" | "/profile" | "/training";
  icon: "activity" | "award" | "check-circle" | "clock" | "user" | "user-check";
  id: AppNotificationKind;
  requiresAction: boolean;
  title: string;
};

type NotificationInputs = {
  arabic: boolean;
  assessment?: AssessmentOverview;
  avatars?: AvatarListView;
  plan?: WorkoutPlan | null;
  profile: UserProfile;
};

function avatarNotification(avatar: AvatarView | undefined, arabic: boolean, latestMeasurementsAt: string | null): AppNotification {
  if (!avatar) {
    return {
      actionLabel: phrase("copy_317bbd2e92bb", arabic),
      body: phrase("copy_61cd3c6bd9a2", arabic),
      href: "/avatar",
      icon: "user-check",
      id: "avatar_build",
      requiresAction: true,
      title: phrase("copy_96be8c2bc9c5", arabic),
    };
  }
  if (avatar.state === "approved") {
    const renewal = avatarRenewalStatus(avatar.measurements_recorded_at, latestMeasurementsAt);
    if (renewal !== "current") {
      return {
        actionLabel: arabic ? renewal === "new_measurements" ? "تحديث الصورة" : "تحديث القياسات" : renewal === "new_measurements" ? "Refresh portrait" : "Update measurements",
        body: arabic ? renewal === "new_measurements" ? "قياساتك الجديدة جاهزة لصورة خاصة تراجعها قبل اعتمادها." : "مرّ نحو شهرين على آخر قياساتك. حدّثها لتبقى صورتك قريبة من شكلك الحالي." : renewal === "new_measurements" ? "New body data is ready. Make a private portrait and review it before replacing your approved version." : "It has been about two months since your last measurements. Update them before refreshing your portrait.",
        href: "/avatar", icon: "user-check", id: "avatar_refresh", requiresAction: true,
        title: phrase("copy_aa14244c5d73", arabic),
      };
    }
  }
  const byState: Record<AvatarState, AppNotification> = {
    approved: {
      actionLabel: phrase("copy_6faece7d005c", arabic),
      body: phrase("copy_74864200e0be", arabic),
      href: "/avatar", icon: "check-circle", id: "avatar_ready", requiresAction: false,
      title: phrase("copy_b0101e935c8f", arabic),
    },
    failed: {
      actionLabel: phrase("copy_3400efd81139", arabic),
      body: phrase("copy_6da641bd68ef", arabic),
      href: "/avatar", icon: "user", id: "avatar_failed", requiresAction: true,
      title: phrase("copy_01ed6de347bd", arabic),
    },
    processing: {
      actionLabel: phrase("copy_899449f07169", arabic),
      body: phrase("copy_7e5d6a43dd54", arabic),
      href: "/avatar", icon: "clock", id: "avatar_processing", requiresAction: false,
      title: phrase("copy_79612888d9f3", arabic),
    },
    ready_for_review: {
      actionLabel: phrase("copy_da2b65ea2065", arabic),
      body: phrase("copy_0d59e518ea69", arabic),
      href: "/avatar", icon: "user-check", id: "avatar_review", requiresAction: true,
      title: phrase("copy_c4f309bac199", arabic),
    },
    rejected: {
      actionLabel: phrase("copy_e0814f8d5fb6", arabic),
      body: phrase("copy_262244111fae", arabic),
      href: "/avatar", icon: "user", id: "avatar_failed", requiresAction: true,
      title: phrase("copy_be1f592878ae", arabic),
    },
    requested: {
      actionLabel: phrase("copy_899449f07169", arabic),
      body: phrase("copy_ad2291bd25cb", arabic),
      href: "/avatar", icon: "clock", id: "avatar_processing", requiresAction: false,
      title: phrase("copy_83832bcc6f87", arabic),
    },
  };
  return byState[avatar.state];
}

export function buildAppNotifications({
  arabic,
  assessment,
  avatars,
  plan,
  profile,
}: NotificationInputs): AppNotification[] {
  const items: AppNotification[] = [];
  if (assessment && assessment.completion < 100) {
    items.push({
      actionLabel: phrase("copy_553c5df7b503", arabic),
      body: phraseTemplate("copy_c254a4bf3c0c", arabic, (arabic) ? [assessment.completion] : [assessment.completion]),
      href: "/profile",
      icon: "user",
      id: "profile_completion",
      requiresAction: true,
      title: phrase("copy_dca03c8ee2d4", arabic),
    });
  }
  const hasWeeklyPlan = plan && plan.generation_snapshot.source !== "manual";
  if (plan === null || (plan && !hasWeeklyPlan)) {
    const hasManualWorkout = Boolean(plan);
    items.push({
      actionLabel: phrase("copy_5b45c7321c4d", arabic),
      body: hasManualWorkout
        ? phraseTemplate("copy_dd3908eb5385", arabic, (arabic) ? [profile.available_training_days] : [profile.available_training_days])
        : phrase("copy_28e106b36b11", arabic),
      href: "/training", icon: "activity", id: "plan_missing", requiresAction: true,
      title: phrase("copy_41ea95c0fc73", arabic),
    });
  } else if (plan) {
    items.push({
      actionLabel: phrase("copy_b1457ad68656", arabic),
      body: phraseTemplate("copy_85b77a52fb6b", arabic, (arabic) ? [plan.days_per_week] : [plan.days_per_week]),
      href: "/training", icon: "check-circle", id: "plan_ready", requiresAction: false,
      title: phrase("copy_f00771b3e364", arabic),
    });
  }
  if (assessment?.latest && avatars) {
    items.push(avatarNotification(avatars.items[0], arabic, assessment.latest.created_at));
  }
  if (assessment?.score.value !== null && assessment?.score.value !== undefined) {
    items.push({
      actionLabel: phrase("copy_2f3c2d66b883", arabic),
      body: phraseTemplate("copy_454a5f5c1a34", arabic, (arabic) ? [assessment.score.value] : [assessment.score.value]),
      href: "/profile", icon: "award", id: "score_update", requiresAction: false,
      title: phrase("copy_21982b0a8b01", arabic),
    });
  }
  return items.sort((a, b) => Number(b.requiresAction) - Number(a.requiresAction));
}

export type AvatarJourney = {
  next: string;
  progress: number;
  status: string;
};

export function getAvatarJourney(
  avatar: AvatarView | undefined,
  hasAssessment: boolean,
  arabic: boolean,
): AvatarJourney {
  if (!hasAssessment) return { progress: 15, status: phrase("copy_8ba5b9bd1bc4", arabic), next: phrase("copy_02495666879f", arabic) };
  if (!avatar) return { progress: 45, status: phrase("copy_2c23a6db9d84", arabic), next: phrase("copy_00db51742e47", arabic) };
  if (avatar.state === "requested" || avatar.state === "processing") return { progress: 72, status: phrase("copy_8c970188707c", arabic), next: phrase("copy_d42bdbe32489", arabic) };
  if (avatar.state === "ready_for_review") return { progress: 88, status: phrase("copy_4f750d85dbac", arabic), next: phrase("copy_5eae45ecc5b4", arabic) };
  if (avatar.state === "approved") return { progress: 100, status: phrase("copy_89c27baa7e29", arabic), next: phrase("copy_73b55ad51288", arabic) };
  return { progress: 55, status: phrase("copy_d8965bab897c", arabic), next: phrase("copy_3596ad3e7fdb", arabic) };
}
