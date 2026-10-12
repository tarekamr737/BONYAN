import { useQuery } from "@tanstack/react-query";

import { getAssessment, getMyProfile } from "../../features/auth/api/profileApi";
import { listAvatars } from "../../features/avatar/api";
import { getCurrentWorkoutPlan } from "../../features/training/api/trainingApi";
import { buildAppNotifications } from "./appNotifications";
import {getFriends, getChallenges} from "../../features/game/api";
import {useLocale} from "../i18n/LocaleProvider";

export function useAppNotifications() {
  const {rtl: arabic} = useLocale();
  const profile = useQuery({ queryKey: ["profile", "me"], queryFn: getMyProfile });
  const assessment = useQuery({ queryKey: ["assessment"], queryFn: getAssessment });
  const plan = useQuery({ queryKey: ["training", "current-plan"], queryFn: getCurrentWorkoutPlan });
  const avatars = useQuery({ queryKey: ["avatars"], queryFn: listAvatars });
  const friends = useQuery({queryKey: ["game", "friends"], queryFn: getFriends, staleTime: 30_000});
  const challenges = useQuery({queryKey: ["game", "challenges"], queryFn: getChallenges, staleTime: 30_000});
  const notifications = profile.data
    ? buildAppNotifications({
        arabic,
        assessment: assessment.data,
        avatars: avatars.data,
        plan: plan.data,
        profile: profile.data,
        friends: friends.data?.items,
        challenges: challenges.data,
      })
    : [];
  return {
    arabic,
    assessment,
    avatars,
    notifications,
    plan,
    profile,
    friends,
    challenges,
    refetch: () => Promise.all([profile.refetch(), assessment.refetch(), plan.refetch(), avatars.refetch(), friends.refetch(), challenges.refetch()]),
    requiresActionCount: notifications.filter((item) => item.requiresAction).length,
  };
}
