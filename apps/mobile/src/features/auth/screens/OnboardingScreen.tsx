import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, spacing } from "../../../core/theme/tokens";
import { updateMyProfile } from "../api/profileApi";
import { ProfileForm } from "../components/ProfileForm";
import type { ProfileUpdate } from "../types";

export function OnboardingScreen() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (update: ProfileUpdate) => updateMyProfile(update),
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile", "me"], profile);
      router.replace("/");
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.step}>PROFILE / 01 OF 01</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Set your training baseline
          </Text>
          <Text style={styles.copy}>
            A few quick choices give BONYAN enough context to personalize your training.
            You can change everything later.
          </Text>
        </View>
        <ProfileForm
          error={mutation.error instanceof Error ? mutation.error.message : null}
          loading={mutation.isPending}
          onboardingCompleted
          onSubmit={(update) => mutation.mutate(update)}
          submitLabel="Finish setup"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  step: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 34,
    letterSpacing: -1.4,
    lineHeight: 40,
    marginTop: spacing.sm,
  },
  copy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.md,
  },
});
