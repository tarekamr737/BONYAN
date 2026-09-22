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
import {
  accountDeletionConfirmationActions,
  usesInlineAccountDeletionConfirmation,
} from "../accountDeletionConfirmation";
import { deleteMyAccount, getMyProfile, updateMyProfile } from "../api/profileApi";
import { CoachingJourney } from "../components/CoachingJourney";
import { ProfileOverview } from "../components/ProfileOverview";
import { ProfilePhotoEditor } from "../components/ProfilePhotoEditor";


export function ProfileScreen() {
  const [editing, setEditing] = useState(false);
  const { signOut } = useAuthSession();
  const [showWebDeletionConfirmation, setShowWebDeletionConfirmation] = useState(false);
  const queryClient = useQueryClient();
  const profile = useQuery({ queryFn: getMyProfile, queryKey: ["profile", "me"] });
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
      arabic ? "حذف حساب بُنيان؟" : "Delete your BONYAN account?",
      arabic
        ? "سيتم حذف ملفك وتقارير InBody والتمارين والصور والملفات الخاصة نهائيًا. لا يمكن التراجع عن هذا الإجراء."
        : "This permanently deletes your profile, InBody reports, workouts, avatars, posts, and private files. This cannot be undone.",
      [
        { style: "cancel", text: arabic ? "الاحتفاظ بالحساب" : "Keep account" },
        {
          onPress: () => deletion.mutate(),
          style: "destructive",
          text: arabic ? "حذف نهائي" : "Delete permanently",
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
        <ScreenState message="Loading your profile." variant="loading" />
      </SafeAreaView>
    );
  }
  if (profile.isError || !profile.data) {
    return (
      <SafeAreaView style={styles.safeArea}><GlassBackdrop />
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
        <View style={styles.profileContent}>
          <ProfilePhotoEditor profile={profile.data} />
          <ProfileOverview profile={profile.data} onEdit={() => setEditing(true)} />
        </View>
        <View style={styles.sessionActions}>
          <AppButton label={arabic ? "إعادة جولة الصفحة الرئيسية" : "Replay Home tour"} loading={replayTour.isPending} onPress={() => replayTour.mutate()} variant="secondary" />
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
            {arabic ? "حذف الحساب" : "Delete account"}
          </Text>
          <Text style={styles.dangerCopy}>
            {arabic
              ? "حذف حساب بُنيان وكل بياناتك نهائيًا، بما فيها التقارير الخاصة والمجسّمات التي تم إنشاؤها."
              : "Permanently remove your BONYAN account and all data you own, including private reports and generated avatars."}
          </Text>
          {deletion.isError ? (
            <Text accessibilityLiveRegion="polite" style={styles.dangerError}>
              {deletion.error instanceof Error
                ? deletion.error.message
                : arabic
                  ? "تعذّر حذف حسابك. حاول مرة أخرى."
                  : "Your account could not be deleted. Please try again."}
            </Text>
          ) : null}
          <AppButton
            label={arabic ? "حذف حسابي" : "Delete my account"}
            loading={deletion.isPending}
            onPress={confirmAccountDeletion}
            variant="danger"
          />
          {showWebDeletionConfirmation ? (
            <View accessibilityRole="alert" style={styles.deletionConfirmation}>
              <Text accessibilityRole="header" style={styles.confirmationTitle}>
                {arabic ? "حذف هذا الحساب نهائيًا؟" : "Permanently delete this account?"}
              </Text>
              <Text style={styles.dangerCopy}>
                {arabic
                  ? "لا يمكن التراجع عن هذا الإجراء. سيتم حذف تقاريرك وتمارينك ومجسّماتك ومنشوراتك."
                  : "This action cannot be undone. Your private reports, workouts, avatars, and posts will be removed."}
              </Text>
              <View style={styles.confirmationActions}>
                <AppButton
                  accessibilityLabel={arabic ? "إلغاء حذف الحساب" : "Cancel account deletion"}
                  label={arabic ? "الاحتفاظ بالحساب" : "Keep account"}
                  onPress={webConfirmation.cancel}
                  variant="secondary"
                />
                <AppButton
                  accessibilityLabel={arabic ? "تأكيد حذف الحساب نهائيًا" : "Confirm permanent account deletion"}
                  label={arabic ? "حذف نهائي" : "Delete permanently"}
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
