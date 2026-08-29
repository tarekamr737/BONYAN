import { useRouter } from "expo-router";

import { AvatarScreen } from "../../src/features/avatar/screens/AvatarScreen";

export default function AvatarRoute() {
  const router = useRouter();
  return <AvatarScreen onBack={() => router.back()} />;
}
