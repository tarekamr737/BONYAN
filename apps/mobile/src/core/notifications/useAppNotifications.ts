import { useQuery } from "@tanstack/react-query";

import { getAssessment, getMyProfile } from "../../features/auth/api/profileApi";
import { listAvatars } from "../../features/avatar/api";
import { getCurrentWorkoutPlan } from "../../features/training/api/trainingApi";
import { buildAppNotifications } from "./appNotifications";

export function useAppNotifications() {
  const profile = useQuery({ queryKey: ["profile", "me"], queryFn: getMyProfile });
  const assessment = useQuery({ queryKey: ["assessment"], queryFn: getAssessment });
  const plan = useQuery({ queryKey: ["training", "current-plan"], queryFn: getCurrentWorkoutPlan });
  const avatars = useQuery({ queryKey: ["avatars"], queryFn: listAvatars });
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;
  const notifications = profile.data
    ? buildAppNotifications({
        arabic,
        assessment: assessment.data,
        avatars: avatars.data,
        plan: plan.data,
        profile: profile.data,
      })
    : [];
  return {
    arabic,
    assessment,
    avatars,
    notifications,
    plan,
    profile,
    refetch: () => Promise.all([profile.refetch(), assessment.refetch(), plan.refetch(), avatars.refetch()]),
    requiresActionCount: notifications.filter((item) => item.requiresAction).length,
  };
}
