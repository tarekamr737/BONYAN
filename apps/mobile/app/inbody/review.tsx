import { useLocalSearchParams } from "expo-router";

import { InBodyReviewScreen } from "../../src/features/inbody";

export default function ReviewRoute() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  return <InBodyReviewScreen scanId={scanId ?? ""} />;
}
