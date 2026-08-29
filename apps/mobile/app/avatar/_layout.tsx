import { Redirect, Stack } from "expo-router";

import { useAuthSession } from "../../src/core/auth/session";

export default function AvatarLayout() {
  const { isAuthenticated } = useAuthSession();

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
