import { router } from "expo-router";

import { goBackOr } from "../../src/core/navigation/safeNavigation";
import { CommunityFeedScreen } from "../../src/features/community/screens/CommunityFeedScreen";

export default function CommunityRoute() {
  return (
    <CommunityFeedScreen
      onBack={() => goBackOr("/")}
      onCreatePost={() => router.push("./create")}
    />
  );
}
