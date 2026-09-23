import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { SpaceGrotesk_500Medium } from "@expo-google-fonts/space-grotesk/500Medium";
import { SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk/600SemiBold";
import { SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk/700Bold";
import { useFonts } from "expo-font";
import { useQuery } from "@tanstack/react-query";
import { Redirect, Stack, usePathname, useRouter } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppTaskbar } from "../src/core/components/AppTaskbar";
import { HomeTourProvider } from "../src/core/tour/HomeTour";
import { LanguageDirection } from "../src/core/components/DirectionalText";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppProviders } from "../src/core/providers/AppProviders";
import { ScreenState } from "../src/core/components";
import { useAuthSession } from "../src/core/auth/session";
import { colors, spacing } from "../src/core/theme/tokens";
import { getMyProfile } from "../src/features/auth/api/profileApi";
import { AuthLoadingScreen } from "../src/features/auth/screens/AuthLoadingScreen";

import { readIntroCompleted, storeIntroCompleted } from "../src/core/auth/introStorage";
import { AuthEntryPreferences } from "../src/features/auth/screens/SignInScreen";
import { IntroScreen } from "../src/features/auth/screens/IntroScreen";

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
      <Head>
        <title>BONYAN</title>
        <meta
          content="Military physical preparation and gym training, with personalized plans and progress tracking."
          name="description"
        />
      </Head>
      <StatusBar style="light" />
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const { isAuthenticated, isRestoring } = useAuthSession();
  const pathname = usePathname();
  const router = useRouter();
  const [intro, setIntro] = useState<boolean | null>(null);
  const [authChoice, setAuthChoice] = useState<{mode: string; language: string} | null>(null);
  const [introError, setIntroError] = useState(false);
  function restoreIntro() { setIntroError(false); void readIntroCompleted().then(setIntro).catch(() => setIntroError(true)); }
  useEffect(() => { void readIntroCompleted().then(setIntro).catch(() => setIntroError(true)); }, []);
  useEffect(() => { if (isAuthenticated && !isRestoring && intro === false) void storeIntroCompleted().then(() => setIntro(true)).catch(() => {}); }, [isAuthenticated, isRestoring, intro]);
  const profile = useQuery({
    enabled: isAuthenticated && !isRestoring,
    queryFn: getMyProfile,
    queryKey: ["profile", "me"],
  });
  const inAuthGroup = pathname === "/sign-in";
  const inOnboardingGroup = pathname === "/onboarding";
  function completeIntro(register: boolean, arabic: boolean) {
    const choice = { mode: register ? "register" : "login", language: arabic ? "ar" : "en" };
    setAuthChoice(choice);
    setIntro(true);
    router.replace({ pathname: "/sign-in", params: choice });
  }

  if (introError) return <SafeAreaView style={styles.gateState}><ScreenState variant="error" title="Startup unavailable" message="Your device preferences could not be loaded." actionLabel="Try again" onAction={restoreIntro} /></SafeAreaView>;
  if (isRestoring || intro === null) {
    return <AuthLoadingScreen />;
  }
  if (!intro && !isAuthenticated) return <IntroScreen onComplete={completeIntro} />;
  if (!isAuthenticated) {
    return inAuthGroup ? <AuthEntryPreferences.Provider value={authChoice}><AppStack key={`${authChoice?.mode}-${authChoice?.language}`} /></AuthEntryPreferences.Provider> : <Redirect href={{pathname: "/sign-in", params: authChoice ?? {}}} />;
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
  if (!profile.data.onboarding_completed && !inOnboardingGroup && !pathname.startsWith("/inbody")) {
    return <Redirect href="/onboarding" />;
  }
  if (profile.data.onboarding_completed && (inAuthGroup || inOnboardingGroup)) {
    return <Redirect href="/" />;
  }
  const arabic = profile.data.preferred_language.startsWith("ar");
  return <LanguageDirection.Provider value={arabic}><HomeTourProvider arabic={arabic} profile={profile.data}><View style={{flex: 1}}><View style={{flex: 1}}><AppStack /></View>{profile.data.onboarding_completed ? <AppTaskbar arabic={arabic} /> : null}</View></HomeTourProvider></LanguageDirection.Provider>;
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
