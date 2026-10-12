import { phrase } from "../../../core/i18n/copy";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { GlassBackdrop } from "../../../core/components/GlassSurface";
import { coachingCopy } from "../coachingCopy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton, ScreenState } from "../../../core/components";
import {FeatureHeader} from "../../../core/components/FeatureHeader";
import {InfoSheet} from "../../../core/components/InfoSheet";
import {ProfileAvatar} from "../../../core/components/ProfileAvatar";
import {getGameOverview} from "../../game/api";
import {planLabel} from "../../../core/i18n/fitness";
import {formatNumber, normalizeLocale} from "../../../core/i18n/messages";
import type {ProfileUpdate} from "../types";
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
  const {t, rtl, locale, setLocale} = useLocale();
  const [showInfo, setShowInfo] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const game = useQuery({queryKey: ["game", "overview"], queryFn: getGameOverview});
  const [editing, setEditing] = useState(false);
  const { signOut } = useAuthSession();
  const [showWebDeletionConfirmation, setShowWebDeletionConfirmation] = useState(false);
  const queryClient = useQueryClient();
  const {replayTour: resetHomeTour} = useHomeTour();
  const profile = useQuery({ queryFn: getMyProfile, queryKey: ["profile", "me"] });
  const moderation = useQuery({queryKey: ["community", "moderation-role"], queryFn: getModerationRole});
  const arabic = rtl;
  const deletion = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: async () => {
      queryClient.clear();
      await signOut();
      router.replace("/(auth)/sign-in");
    },
  });
  const preferences = useMutation({
    mutationFn: (update: ProfileUpdate) => updateMyProfile(update),
    onSuccess: async (updated, variables) => {
      queryClient.setQueryData(["profile", "me"], updated);
      if (variables.preferred_language) await setLocale(normalizeLocale(updated.preferred_language));
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
        <FeatureHeader title={t("profile")} showProfile={false} onBack={() => router.canGoBack() ? router.back() : router.replace("/")} onInfo={() => setShowInfo(true)}/>
        <View style={[styles.identity, rtl && {flexDirection: "row-reverse"}]}>
          <ProfileAvatar displayName={profile.data.display_name} hasPhoto={profile.data.has_profile_photo} photoUpdatedAt={profile.data.profile_photo_updated_at} size={72} onPress={() => setShowPhoto(!showPhoto)} accessibilityLabel={t("editProfilePhoto")}/>
          <View style={{flex: 1, gap: 4}}><Text style={styles.name}>{profile.data.display_name ?? t("profile")}</Text><Text style={styles.copy}>{profile.data.training_goal ? planLabel(profile.data.training_goal, rtl) : t("editTrainingProfile")}</Text>{game.data ? <Text style={styles.level}>{t("level")} {formatNumber(game.data.level, locale)} · {formatNumber(game.data.xp, locale)} {t("xp")}</Text> : null}</View>
        </View>
        <AppButton variant="green" label={t("editTrainingProfile")} onPress={() => setEditing(true)}/>
        <AppButton variant="secondary" label={t("editProfilePhoto")} onPress={() => setShowPhoto(!showPhoto)} accessibilityState={{expanded: showPhoto}}/>
        {showPhoto ? <ProfilePhotoEditor profile={profile.data}/> : null}
        <View style={styles.preferenceGroup}>
          <Text style={styles.groupTitle}>{t("preferencesTitle")}</Text>
          <Text style={styles.copy}>{t("languagePreference")}</Text>
          <View style={[styles.choices, rtl && {flexDirection: "row-reverse"}]}>{(["en", "ar-EG"] as const).map(option => <Pressable key={option} accessibilityRole="radio" accessibilityState={{selected: locale === option, disabled: preferences.isPending}} disabled={preferences.isPending} onPress={() => preferences.mutate({preferred_language: option})} style={[styles.choice, locale === option && styles.choiceSelected]}><Text style={styles.choiceText}>{option === "en" ? "English" : "العربية"}</Text></Pressable>)}</View>
          <Text style={styles.copy}>{t("unitsPreference")}</Text>
          <View style={[styles.choices, rtl && {flexDirection: "row-reverse"}]}>{(["metric", "imperial"] as const).map(option => <Pressable key={option} accessibilityRole="radio" accessibilityState={{selected: profile.data?.preferred_units === option, disabled: preferences.isPending}} disabled={preferences.isPending} onPress={() => preferences.mutate({preferred_units: option})} style={[styles.choice, profile.data?.preferred_units === option && styles.choiceSelected]}><Text style={styles.choiceText}>{t(option === "metric" ? "kilogram" : "pound")}</Text></Pressable>)}</View>
          {preferences.isError ? <Text accessibilityRole="alert" style={styles.dangerError}>{t("request_failed")}</Text> : null}
        </View>
        <View style={styles.links}>
          <AppButton variant="secondary" label={t("privacySettings")} onPress={() => router.push("/privacy")}/>
          <AppButton variant="secondary" label={t("assessmentHistory")} onPress={() => setShowInfo(true)}/>
          <AppButton variant="secondary" label={t("leagueTab")} onPress={() => router.push("/league")}/>
          {moderation.data?.can_moderate ? <AppButton variant="secondary" label={t("moderation")} onPress={() => router.push("/moderation")}/> : null}
        </View>
        <InfoSheet visible={showInfo} title={t("assessmentHistory")} onClose={() => setShowInfo(false)}>
          <ProfileOverview profile={profile.data} onEdit={() => {setShowInfo(false); setEditing(true);}}/>
          <AppButton variant="secondary" label={t("progressScore")} onPress={() => {setShowInfo(false); router.push("/progress-score");}}/>
          <AppButton variant="secondary" label={t("weeklyMission")} onPress={() => {setShowInfo(false); router.push("/missions");}}/>
          <AppButton label={phrase("copy_49f2d3b93452", arabic)} loading={replayTour.isPending} onPress={() => {setShowInfo(false); replayTour.mutate();}} variant="secondary"/>
        </InfoSheet>
        <View style={styles.sessionActions}>
          <AppButton label={coachingCopy("Back to BONYAN", arabic)} onPress={() => router.canGoBack() ? router.back() : router.replace("/")} variant="secondary" />
          <AppButton
            label={coachingCopy("Sign out", arabic)}
            onPress={() => {
              queryClient.clear();
              void signOut();
            }}
            variant="secondary"
          />
        </View>
        <AppButton variant="secondary" label={t("manageAccount")} onPress={() => setShowAccount(!showAccount)} accessibilityState={{expanded: showAccount}}/>
        {showAccount ? <View style={styles.dangerZone}>
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
        </View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  identity: {flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 8},
  name: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 24},
  level: {color: colors.green, fontFamily: fonts.bodySemiBold, fontSize: 13},
  preferenceGroup: {padding: 16, gap: 10, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.line},
  groupTitle: {color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 18},
  choices: {flexDirection: "row", gap: 10},
  choice: {flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.line},
  choiceSelected: {backgroundColor: colors.greenSoft, borderColor: colors.greenBorder},
  choiceText: {color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14},
  links: {gap: 10},

  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 660,
    alignSelf: "center",
    gap: spacing.md,
    padding: spacing.md,
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
