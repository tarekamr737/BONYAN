import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "../api/profileApi";
import { CoachingJourney } from "../components/CoachingJourney";
import { ScreenState } from "../../../core/components";
export function OnboardingScreen() {
 const profile = useQuery({queryKey: ["profile", "me"], queryFn: getMyProfile});
 return profile.data ? <CoachingJourney profile={profile.data} /> : <ScreenState variant="loading" message="Loading your starting point." />;
}
