import { goBackOr } from "../../src/core/navigation/safeNavigation";
import { AvatarScreen } from "../../src/features/avatar/screens/AvatarScreen";

export default function AvatarRoute() {
  return <AvatarScreen onBack={() => goBackOr("/")} />;
}
