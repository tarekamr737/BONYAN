import { router } from "expo-router";

import { goBackOr } from "../../src/core/navigation/safeNavigation";
import { CreatePostScreen } from "../../src/features/community/screens/CreatePostScreen";

export default function CreateCommunityPostRoute() {
  return (
    <CreatePostScreen
      onBack={() => goBackOr("/community")}
      onManageAvatar={() => router.push("../avatar")}
      onPosted={() => router.replace("../")}
    />
  );
}
