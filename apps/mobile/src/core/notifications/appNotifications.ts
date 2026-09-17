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
      actionLabel: arabic ? "إنشاء الـAvatar" : "Build avatar",
      body: arabic
        ? "قياساتك جاهزة. أنشئ Avatar خاصًا يعكس أحدث بيانات جسمك."
        : "Your measurements are ready. Build a private avatar from your latest body data.",
      href: "/avatar",
      icon: "user-check",
      id: "avatar_build",
      requiresAction: true,
      title: arabic ? "الـAvatar جاهز للإنشاء" : "Your avatar can be built",
    };
  }
  if (avatar.state === "approved") {
    const renewal = avatarRenewalStatus(avatar.measurements_recorded_at, latestMeasurementsAt);
    if (renewal !== "current") {
      return {
        actionLabel: arabic ? renewal === "new_measurements" ? "تحديث الصورة" : "تحديث القياسات" : renewal === "new_measurements" ? "Refresh portrait" : "Update measurements",
        body: arabic ? renewal === "new_measurements" ? "قياساتك الجديدة جاهزة لصورة خاصة تراجعها قبل اعتمادها." : "مرّ نحو شهرين على آخر قياساتك. حدّثها لتبقى صورتك قريبة من شكلك الحالي." : renewal === "new_measurements" ? "New body data is ready. Make a private portrait and review it before replacing your approved version." : "It has been about two months since your last measurements. Update them before refreshing your portrait.",
        href: "/avatar", icon: "user-check", id: "avatar_refresh", requiresAction: true,
        title: arabic ? "خلّي صورتك مواكبة لتقدمك" : "Keep your portrait current",
      };
    }
  }
  const byState: Record<AvatarState, AppNotification> = {
    approved: {
      actionLabel: arabic ? "عرض الـAvatar" : "View avatar",
      body: arabic ? "نسختك المعتمدة محفوظة بأمان ويمكنك تحديثها بعد قياس جديد." : "Your approved version is saved and can be refreshed after a new assessment.",
      href: "/avatar", icon: "check-circle", id: "avatar_ready", requiresAction: false,
      title: arabic ? "الـAvatar جاهز" : "Avatar ready",
    },
    failed: {
      actionLabel: arabic ? "إعادة المحاولة" : "Try again",
      body: arabic ? "توقف الإنشاء قبل الاكتمال. بياناتك ما زالت محفوظة." : "Generation stopped before finishing. Your data is still saved.",
      href: "/avatar", icon: "user", id: "avatar_failed", requiresAction: true,
      title: arabic ? "الـAvatar يحتاج مراجعة" : "Avatar needs attention",
    },
    processing: {
      actionLabel: arabic ? "متابعة التجهيز" : "View progress",
      body: arabic ? "نعالج الصورة والقياسات الآن. يمكنك متابعة التجهيز من صفحة الـAvatar." : "Your photo and measurements are being processed. Follow progress on the avatar screen.",
      href: "/avatar", icon: "clock", id: "avatar_processing", requiresAction: false,
      title: arabic ? "جارٍ تجهيز الـAvatar" : "Avatar is being prepared",
    },
    ready_for_review: {
      actionLabel: arabic ? "مراجعة واعتماد" : "Review avatar",
      body: arabic ? "النسخة الجديدة جاهزة لمراجعتك قبل اعتمادها." : "A new version is ready for your review before it is approved.",
      href: "/avatar", icon: "user-check", id: "avatar_review", requiresAction: true,
      title: arabic ? "راجع الـAvatar الجديد" : "Review your new avatar",
    },
    rejected: {
      actionLabel: arabic ? "إنشاء نسخة جديدة" : "Build another version",
      body: arabic ? "يمكنك إنشاء نسخة أخرى باستخدام أحدث قياساتك." : "You can build another version from your latest measurements.",
      href: "/avatar", icon: "user", id: "avatar_failed", requiresAction: true,
      title: arabic ? "أنشئ نسخة أنسب" : "Build a better match",
    },
    requested: {
      actionLabel: arabic ? "متابعة التجهيز" : "View progress",
      body: arabic ? "تم استلام طلبك وسيبدأ تجهيز الـAvatar." : "Your request is queued and avatar preparation is starting.",
      href: "/avatar", icon: "clock", id: "avatar_processing", requiresAction: false,
      title: arabic ? "طلب الـAvatar وصل" : "Avatar request received",
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
      actionLabel: arabic ? "إكمال الملف" : "Complete profile",
      body: arabic
        ? `ملفك مكتمل بنسبة ${assessment.completion}%. أضف البيانات المفيدة لتحسين التقييم والخطة.`
        : `Your profile is ${assessment.completion}% complete. Add useful details to improve your score and plan.`,
      href: "/profile",
      icon: "user",
      id: "profile_completion",
      requiresAction: true,
      title: arabic ? "أكمل ملفك الشخصي" : "Complete your profile",
    });
  }
  const hasWeeklyPlan = plan && plan.generation_snapshot.source !== "manual";
  if (plan === null || (plan && !hasWeeklyPlan)) {
    const hasManualWorkout = Boolean(plan);
    items.push({
      actionLabel: arabic ? "تجهيز الخطة" : "Prepare plan",
      body: hasManualWorkout
        ? arabic
          ? `تم حفظ تمرينك اليدوي. جهّز خطة أسبوعية تناسب ${profile.available_training_days} أيام عندما تكون مستعدًا.`
          : `Your custom workout is saved. Prepare a ${profile.available_training_days}-day weekly plan when you're ready.`
        : arabic
          ? "سنستخدم هدفك وخبرتك وأيامك المتاحة لبناء نظام تمرين مناسب."
          : "We will use your goal, experience and available days to prepare your training system.",
      href: "/training", icon: "activity", id: "plan_missing", requiresAction: true,
      title: arabic ? "خطتك الأسبوعية لم تُجهّز بعد" : "Your weekly plan is not ready yet",
    });
  } else if (plan) {
    items.push({
      actionLabel: arabic ? "فتح التمرين" : "Open training",
      body: arabic
        ? `خطتك النشطة جاهزة: ${plan.days_per_week} أيام أسبوعيًا.`
        : `Your active plan is ready for ${plan.days_per_week} days each week.`,
      href: "/training", icon: "check-circle", id: "plan_ready", requiresAction: false,
      title: arabic ? "خطة تمرينك جاهزة" : "Your training plan is ready",
    });
  }
  if (assessment?.latest && avatars) {
    items.push(avatarNotification(avatars.items[0], arabic, assessment.latest.created_at));
  }
  if (assessment?.score.value !== null && assessment?.score.value !== undefined) {
    items.push({
      actionLabel: arabic ? "عرض التفاصيل" : "View details",
      body: arabic
        ? `مؤشر تقدمك الحالي ${assessment.score.value}/100 ويُحدّث مع القياسات والأداء المهم.`
        : `Your current coaching score is ${assessment.score.value}/100 and updates with meaningful body and performance data.`,
      href: "/profile", icon: "award", id: "score_update", requiresAction: false,
      title: arabic ? "تقييم تقدمك محدث" : "Your progress score is up to date",
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
  if (!hasAssessment) return { progress: 15, status: arabic ? "ابدأ بقياسات جسمك" : "Start with body data", next: arabic ? "أضف قياسات أو تقرير InBody" : "Add measurements or an InBody report" };
  if (!avatar) return { progress: 45, status: arabic ? "بيانات الجسم جاهزة" : "Body data ready", next: arabic ? "أنشئ الـAvatar الأول" : "Build your first avatar" };
  if (avatar.state === "requested" || avatar.state === "processing") return { progress: 72, status: arabic ? "جارٍ تجهيز نسختك" : "Preparing your version", next: arabic ? "انتظر اكتمال المعالجة" : "Wait for processing to finish" };
  if (avatar.state === "ready_for_review") return { progress: 88, status: arabic ? "النسخة جاهزة للمراجعة" : "Version ready to review", next: arabic ? "راجع النسخة واعتمدها" : "Review and approve it" };
  if (avatar.state === "approved") return { progress: 100, status: arabic ? "الأفاتار معتمد" : "Avatar approved", next: arabic ? "حدّثه بعد تقييم جسم جديد" : "Refresh it after your next assessment" };
  return { progress: 55, status: arabic ? "النسخة تحتاج إعادة المحاولة" : "Version needs another try", next: arabic ? "أنشئ نسخة من أحدث بياناتك" : "Rebuild from your latest data" };
}
