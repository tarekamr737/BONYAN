import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "../api/profileApi";
import { CoachingJourney } from "../components/CoachingJourney";
import { ScreenState } from "../../../core/components";

export function OnboardingScreen() {
  const profile = useQuery({ queryKey: ["profile", "me"], queryFn: getMyProfile });

  if (profile.isError) {
    return (
      <ScreenState
        actionLabel="Try again"
        message="We couldn't load your starting point. Check your connection and try again."
        onAction={() => void profile.refetch()}
        title="Your setup is still safe"
        variant="error"
      />
    );
  }

  if (!profile.data) {
    return <ScreenState variant="loading" message="Loading your starting point." />;
  }

  return <CoachingJourney profile={profile.data} />;
}
