import { phrase } from "../../../core/i18n/copy";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { GlassBackdrop } from "../../../core/components/GlassSurface";
import { coachingCopy } from "../coachingCopy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton, ScreenState } from "../../../core/components";
import { useAuthSession } from "../../../core/auth/session";
import { colors, fonts, spacing } from "../../../core/theme/tokens";
import { useLocale } from "../../../core/i18n/LocaleProvider";
import { useHomeTour } from "../../../core/tour/HomeTour";
import {
  accountDeletionConfirmationActions,
  usesInlineAccountDeletionConfirmation,
} from "../accountDeletionConfirmation";
import { deleteMyAccount, getMyProfile, updateMyProfile } from "../api/profileApi";
import { CoachingJourney } from "../components/CoachingJourney";
import { ProfileOverview } from "../components/ProfileOverview";
import { ProfilePhotoEditor } from "../components/ProfilePhotoEditor";
import {getModerationRole} from "../../community/ModerationScreen";


export function ProfileScreen() {
  const {t} = useLocale();
  const [editing, setEditing] = useState(false);
  const { signOut } = useAuthSession();
  const [showWebDeletionConfirmation, setShowWebDeletionConfirmation] = useState(false);
  const queryClient = useQueryClient();
  const {replayTour: resetHomeTour} = useHomeTour();
  const profile = useQuery({ queryFn: getMyProfile, queryKey: ["profile", "me"] });
  const moderation = useQuery({queryKey: ["community", "moderation-role"], queryFn: getModerationRole});
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;
  const deletion = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: async () => {
      queryClient.clear();
      await signOut();
      router.replace("/(auth)/sign-in");
    },
  });
  const replayTour = useMutation({
    mutationFn: () => updateMyProfile({home_tour_completed: false}),
    onSuccess: updated => {
      queryClient.setQueryData(["profile", "me"], updated);
      resetHomeTour();
      router.replace("/");
    },
  });

  const confirmAccountDeletion = () => {
    if (deletion.isPending) return;
    if (usesInlineAccountDeletionConfirmation(Platform.OS)) {
      setShowWebDeletionConfirmation(true);
      return;
    }
    Alert.alert(
      phrase("copy_85c7cda597bb", arabic),
      phrase("copy_1514f3549ea7", arabic),
      [
        { style: "cancel", text: phrase("copy_4e3da0c0ce06", arabic) },
        {
          onPress: () => deletion.mutate(),
          style: "destructive",
          text: phrase("copy_d5e2a7db1f28", arabic),
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
      <SafeAreaView style={styles.safeArea}><GlassBackdrop />
        <ScreenState message={t("loading")} variant="loading" />
      </SafeAreaView>
    );
  }
  if (profile.isError || !profile.data) {
    return (
      <SafeAreaView style={styles.safeArea}><GlassBackdrop />
        <ScreenState
          actionLabel={t("retry")}
          message={t("request_failed")}
          onAction={() => void profile.refetch()}
          title={t("profile")}
          variant="error"
        />
      </SafeAreaView>
    );
  }

  if (editing) return <CoachingJourney profile={profile.data} editing onDone={() => setEditing(false)} />;

  return (
    <SafeAreaView style={styles.safeArea}><GlassBackdrop />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{coachingCopy("PROFILE & PREFERENCES", profile.data.preferred_language.startsWith("ar"))}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {coachingCopy("Your training story", profile.data.preferred_language.startsWith("ar"))}
          </Text>
          <Text style={styles.copy}>
            {coachingCopy("Your goal, assessments and progress, connected in one place.", profile.data.preferred_language.startsWith("ar"))}
          </Text>
        </View>
        <AppButton label={t("privacySettings")} onPress={() => router.push("/privacy")} />
        {moderation.data?.can_moderate ? <AppButton label={t("moderation")} onPress={() => router.push("/moderation")}/> : null}
        <AppButton label={t("weeklyMission")} onPress={() => router.push("/missions")} />
        <AppButton label={t("progressScore")} onPress={() => router.push("/progress-score")} />
        <View style={styles.profileContent}>
          <ProfilePhotoEditor profile={profile.data} />
          <ProfileOverview profile={profile.data} onEdit={() => setEditing(true)} />
        </View>
        <View style={styles.sessionActions}>
          <AppButton label={phrase("copy_49f2d3b93452", arabic)} loading={replayTour.isPending} onPress={() => replayTour.mutate()} variant="secondary" />
          <AppButton label={coachingCopy("Back to BONYAN", profile.data.preferred_language.startsWith("ar"))} onPress={() => router.canGoBack() ? router.back() : router.replace("/")} variant="secondary" />
          <AppButton
            label={coachingCopy("Sign out", profile.data.preferred_language.startsWith("ar"))}
            onPress={() => {
              queryClient.clear();
              void signOut();
            }}
            variant="secondary"
          />
        </View>
        <View style={styles.dangerZone}>
          <Text accessibilityRole="header" style={styles.dangerTitle}>
            {phrase("copy_6cbb38874eb1", arabic)}
          </Text>
          <Text style={styles.dangerCopy}>
            {phrase("copy_b50b6fea50c1", arabic)}
          </Text>
          {deletion.isError ? (
            <Text accessibilityLiveRegion="polite" style={styles.dangerError}>
              {deletion.error instanceof Error
                ? deletion.error.message
                : phrase("copy_ad94ce5b6101", arabic)}
            </Text>
          ) : null}
          <AppButton
            label={phrase("copy_a203959391cb", arabic)}
            loading={deletion.isPending}
            onPress={confirmAccountDeletion}
            variant="danger"
          />
          {showWebDeletionConfirmation ? (
            <View accessibilityRole="alert" style={styles.deletionConfirmation}>
              <Text accessibilityRole="header" style={styles.confirmationTitle}>
                {phrase("copy_1af9505821fa", arabic)}
              </Text>
              <Text style={styles.dangerCopy}>
                {phrase("copy_ab5951f302bb", arabic)}
              </Text>
              <View style={styles.confirmationActions}>
                <AppButton
                  accessibilityLabel={phrase("copy_71f7c928770a", arabic)}
                  label={phrase("copy_4e3da0c0ce06", arabic)}
                  onPress={webConfirmation.cancel}
                  variant="secondary"
                />
                <AppButton
                  accessibilityLabel={phrase("copy_cc059a1714c5", arabic)}
                  label={phrase("copy_d5e2a7db1f28", arabic)}
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
    width: "100%",
    maxWidth: 660,
    alignSelf: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  profileContent: {
    gap: spacing.md,
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
