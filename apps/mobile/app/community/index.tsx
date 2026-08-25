import { useRouter } from "expo-router";

import { CommunityFeedScreen } from "../../src/features/community/screens/CommunityFeedScreen";

export default function CommunityRoute() {
  const router = useRouter();
  return (
    <CommunityFeedScreen
      onBack={() => router.back()}
      onCreatePost={() => router.push("/community/create")}
    />
  );
}
