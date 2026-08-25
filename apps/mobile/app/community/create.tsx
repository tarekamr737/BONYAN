import { useRouter } from "expo-router";

import { CreatePostScreen } from "../../src/features/community/screens/CreatePostScreen";

export default function CreateCommunityPostRoute() {
  const router = useRouter();
  return (
    <CreatePostScreen
      onBack={() => router.back()}
      onManageAvatar={() => router.push("/avatar")}
      onPosted={() => router.replace("/community")}
    />
  );
}
