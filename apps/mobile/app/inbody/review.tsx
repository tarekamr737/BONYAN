import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "../../src/features/auth/api/profileApi";
import { useLocalSearchParams, useRouter } from "expo-router";

import { InBodyReviewScreen } from "../../src/features/inbody";

export default function ReviewRoute() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const router = useRouter();
  const profile = useQuery({queryKey: ["profile", "me"], queryFn: getMyProfile});
  return (
    <InBodyReviewScreen
      onConfirmed={() => router.replace(profile.data?.onboarding_completed ? "/inbody/progress" : "/onboarding")}
      scanId={scanId ?? ""}
    />
  );
}
