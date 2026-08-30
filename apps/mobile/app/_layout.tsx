import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { SpaceGrotesk_500Medium } from "@expo-google-fonts/space-grotesk/500Medium";
import { SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk/600SemiBold";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk/700Bold";
import { useFonts } from "expo-font";
import { useQuery } from "@tanstack/react-query";
import { Redirect, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppProviders } from "../src/core/providers/AppProviders";
import { ScreenState } from "../src/core/components";
import { useAuthSession } from "../src/core/auth/session";
import { colors, spacing } from "../src/core/theme/tokens";
import { getMyProfile } from "../src/features/auth/api/profileApi";
import { AuthLoadingScreen } from "../src/features/auth/screens/AuthLoadingScreen";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppProviders>
      <StatusBar style="light" />
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const { isAuthenticated, isRestoring } = useAuthSession();
  const pathname = usePathname();
  const profile = useQuery({
    enabled: isAuthenticated && !isRestoring,
    queryFn: getMyProfile,
    queryKey: ["profile", "me"],
  });
  const inAuthGroup = pathname === "/sign-in";
  const inOnboardingGroup = pathname === "/onboarding";

  if (isRestoring) {
    return <AuthLoadingScreen />;
  }
  if (!isAuthenticated) {
    return inAuthGroup ? <AppStack /> : <Redirect href="/sign-in" />;
  }
  if (profile.isPending) {
    return <AuthLoadingScreen />;
  }
  if (profile.isError || !profile.data) {
    return (
      <SafeAreaView style={styles.gateState}>
        <ScreenState
          actionLabel="Try again"
          message="Your secure profile could not be loaded."
          onAction={() => void profile.refetch()}
          title="Profile unavailable"
          variant="error"
        />
      </SafeAreaView>
    );
  }
  if (!profile.data.onboarding_completed && !inOnboardingGroup) {
    return <Redirect href="/onboarding" />;
  }
  if (profile.data.onboarding_completed && (inAuthGroup || inOnboardingGroup)) {
    return <Redirect href="/" />;
  }
  return <AppStack />;
}

const styles = StyleSheet.create({
  gateState: {
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
});

function AppStack() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.canvas },
        headerShown: false,
      }}
    />
  );
}
