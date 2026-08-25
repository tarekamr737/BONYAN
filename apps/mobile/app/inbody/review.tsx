import { useLocalSearchParams, useRouter } from "expo-router";

import { InBodyReviewScreen } from "../../src/features/inbody";

export default function ReviewRoute() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const router = useRouter();
  return (
    <InBodyReviewScreen
      onConfirmed={() => router.replace("./progress")}
      scanId={scanId ?? ""}
    />
  );
}
