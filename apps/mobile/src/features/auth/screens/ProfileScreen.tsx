import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton, ScreenState } from "../../../core/components";
import { useAuthSession } from "../../../core/auth/session";
import { colors, fonts, spacing } from "../../../core/theme/tokens";
import {
  accountDeletionConfirmationActions,
  usesInlineAccountDeletionConfirmation,
} from "../accountDeletionConfirmation";
import { deleteMyAccount, getMyProfile, updateMyProfile } from "../api/profileApi";
import { ProfileForm } from "../components/ProfileForm";
import type { ProfileUpdate } from "../types";

export function ProfileScreen() {
  const { signOut } = useAuthSession();
  const [showWebDeletionConfirmation, setShowWebDeletionConfirmation] = useState(false);
  const queryClient = useQueryClient();
  const profile = useQuery({ queryFn: getMyProfile, queryKey: ["profile", "me"] });
  const mutation = useMutation({
    mutationFn: (update: ProfileUpdate) => updateMyProfile(update),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["profile", "me"], updatedProfile);
    },
  });
  const deletion = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: async () => {
      queryClient.clear();
      await signOut();
      router.replace("/(auth)/sign-in");
    },
  });

  const confirmAccountDeletion = () => {
    if (deletion.isPending) return;
    if (usesInlineAccountDeletionConfirmation(Platform.OS)) {
      setShowWebDeletionConfirmation(true);
      return;
    }
    Alert.alert(
      "Delete your BONYAN account?",
      "This permanently deletes your profile, InBody reports, workouts, avatars, posts, and private files. This cannot be undone.",
      [
        { style: "cancel", text: "Keep account" },
        {
          onPress: () => deletion.mutate(),
          style: "destructive",
          text: "Delete permanently",
        },
      ],
    );
  };
  const webConfirmation = accountDeletionConfirmationActions({
    dismiss: () => setShowWebDeletionConfirmation(false),
    removeAccount: () => deletion.mutate(),
  });

  if (profile.isPending) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenState message="Loading your profile." variant="loading" />
      </SafeAreaView>
    );
  }
  if (profile.isError || !profile.data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenState
          actionLabel="Try again"
          message="Your profile could not be loaded."
          onAction={() => void profile.refetch()}
          title="Profile unavailable"
          variant="error"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>PROFILE &amp; PREFERENCES</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Your BONYAN setup
          </Text>
          <Text style={styles.copy}>
            These preferences guide personalization. InBody measurements stay in their
            own private domain.
          </Text>
        </View>
        <ProfileForm
          error={mutation.error instanceof Error ? mutation.error.message : null}
          initialProfile={profile.data}
          loading={mutation.isPending}
          onboardingCompleted={profile.data.onboarding_completed}
          onSubmit={(update) => mutation.mutate(update)}
          submitLabel={mutation.isSuccess ? "Saved" : "Save profile"}
        />
        <View style={styles.sessionActions}>
          <AppButton label="Back to BONYAN" onPress={() => router.back()} variant="secondary" />
          <AppButton
            label="Sign out"
            onPress={() => {
              queryClient.clear();
              void signOut();
            }}
            variant="secondary"
          />
        </View>
        <View style={styles.dangerZone}>
          <Text accessibilityRole="header" style={styles.dangerTitle}>
            Delete account
          </Text>
          <Text style={styles.dangerCopy}>
            Permanently remove your BONYAN account and all data you own, including private
            reports and generated avatars.
          </Text>
          {deletion.isError ? (
            <Text accessibilityLiveRegion="polite" style={styles.dangerError}>
              {deletion.error instanceof Error
                ? deletion.error.message
                : "Your account could not be deleted. Please try again."}
            </Text>
          ) : null}
          <AppButton
            label="Delete my account"
            loading={deletion.isPending}
            onPress={confirmAccountDeletion}
            variant="danger"
          />
          {showWebDeletionConfirmation ? (
            <View accessibilityRole="alert" style={styles.deletionConfirmation}>
              <Text accessibilityRole="header" style={styles.confirmationTitle}>
                Permanently delete this account?
              </Text>
              <Text style={styles.dangerCopy}>
                This action cannot be undone. Your private reports, workouts, avatars, and posts
                will be removed.
              </Text>
              <View style={styles.confirmationActions}>
                <AppButton
                  accessibilityLabel="Cancel account deletion"
                  label="Keep account"
                  onPress={webConfirmation.cancel}
                  variant="secondary"
                />
                <AppButton
                  accessibilityLabel="Confirm permanent account deletion"
                  label="Delete permanently"
                  loading={deletion.isPending}
                  onPress={webConfirmation.confirm}
                  variant="danger"
                />
              </View>
            </View>
          ) : null}
        </View>
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
  eyebrow: {
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
  sessionActions: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  dangerZone: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: spacing.md,
    marginTop: spacing.xxl,
    paddingTop: spacing.xl,
  },
  dangerTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 20,
  },
  dangerCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  dangerError: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
  },
  deletionConfirmation: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  confirmationTitle: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
  confirmationActions: {
    gap: spacing.sm,
  },
});
