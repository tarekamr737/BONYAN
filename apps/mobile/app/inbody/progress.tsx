import { useRouter } from "expo-router";

import { InBodyProgressScreen } from "../../src/features/inbody";

export default function InBodyProgressRoute() {
  const router = useRouter();

  return (
    <InBodyProgressScreen
      onDone={() => router.replace("/")}
      onUploadAnother={() => router.replace("/inbody")}
    />
  );
}
