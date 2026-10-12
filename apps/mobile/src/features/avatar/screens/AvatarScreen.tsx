import { phrase, phraseTemplate } from "../../../core/i18n/copy";
import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import * as ImagePicker from "expo-image-picker";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { useLocale } from "../../../core/i18n/LocaleProvider";
import { AvatarButton } from "../components/AvatarButton";
import { AvatarBuildProgress } from "../components/AvatarBuildProgress";
import { ManualMeasurementsForm } from "../components/ManualMeasurementsForm";
import { PrivacyTimeline } from "../components/PrivacyTimeline";
import {
  useAvatarMeasurementStatus,
  useAvatarMutations,
  useAvatars,
} from "../hooks";
import type {
  AvatarPresentation,
  AvatarView,
  LocalAvatarSourcePhoto,
} from "../types";
import { avatarRenewalStatus } from "../renewal";
import {useQuery} from "@tanstack/react-query";
import {getGameOverview} from "../../game/api";
import {formatNumber, type MessageKey} from "../../../core/i18n/messages";

type AvatarScreenProps = {
  onBack: () => void;
};

export function AvatarScreen({ onBack }: AvatarScreenProps) {
  const arabic = useContext(LanguageDirection);
  const {t, locale} = useLocale();
  const game = useQuery({queryKey: ["game", "overview"], queryFn: getGameOverview});
  const [photoConsent, setPhotoConsent] = useState(false);
  const [presentation, setPresentation] = useState<AvatarPresentation>("men");
  const avatarsQuery = useAvatars();
  const measurementQuery = useAvatarMeasurementStatus(presentation);
  const mutations = useAvatarMutations();
  const [activeAvatar, setActiveAvatar] = useState<AvatarView | null>(null);
  const [sourcePhoto, setSourcePhoto] = useState<LocalAvatarSourcePhoto | null>(null);
  const [uploadedSourcePhotoId, setUploadedSourcePhotoId] = useState<string | null>(null);
  const [createNewVersion, setCreateNewVersion] = useState(false);
  const [buildStage, setBuildStage] = useState<string | null>(null);

  const displayedAvatar = createNewVersion ? null : activeAvatar ?? avatarsQuery.data?.items[0] ?? null;
  const pending =
    mutations.createMutation.isPending ||
    mutations.sourcePhotoMutation.isPending ||
    mutations.deleteSourcePhotoMutation.isPending ||
    mutations.approveMutation.isPending ||
    mutations.rejectMutation.isPending ||
    mutations.regenerateMutation.isPending ||
    mutations.communityUseMutation.isPending ||
    mutations.deleteMutation.isPending;
  const mutationError = useMemo(() => {
    const error = [
      mutations.createMutation.error,
      mutations.sourcePhotoMutation.error,
      mutations.deleteSourcePhotoMutation.error,
      mutations.approveMutation.error,
      mutations.rejectMutation.error,
      mutations.regenerateMutation.error,
      mutations.communityUseMutation.error,
      mutations.deleteMutation.error,
    ].find(Boolean);
    return error instanceof Error ? error.message : null;
  }, [mutations]);

  function generate() {
    if (!photoConsent) return;
    if (!sourcePhoto) {
      Alert.alert(
        phrase("copy_df639f8ddf60", arabic),
        phrase("copy_4dc0ec248d50", arabic),
      );
      return;
    }
    mutations.resetErrors();
    setBuildStage(phrase("copy_012599780e36", arabic));
    mutations.sourcePhotoMutation.mutate(sourcePhoto, {
      onError: () => setBuildStage(null),
      onSuccess: (uploadedPhoto) => {
        setUploadedSourcePhotoId(uploadedPhoto.id);
        setBuildStage(phrase("copy_eb6eef64d6f9", arabic));
        mutations.createMutation.mutate(
          { style: "photo_measured", presentation, source_photo_id: uploadedPhoto.id },
          {
            onError: () => {
              setBuildStage(null);
              mutations.deleteSourcePhotoMutation.mutate(uploadedPhoto.id, {
                onSuccess: () => setUploadedSourcePhotoId(null),
              });
            },
            onSuccess: (avatar) => {
              setActiveAvatar(avatar);
              setCreateNewVersion(false);
              setBuildStage(null);
            },
          },
        );
      },
    });
  }

  async function chooseSourcePhoto(fromCamera: boolean) {
    mutations.resetErrors();
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        phrase("copy_599cebc19378", arabic),
        phraseTemplate("copy_4f90e6093e31", arabic, (arabic) ? [fromCamera ? "الكاميرا" : "مكتبة الصور"] : [fromCamera ? "camera" : "photo library"]),
      );
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    const selected = result.assets?.[0];
    if (result.canceled || !selected) return;
    setSourcePhoto({
      file: selected.file,
      name: selected.fileName ?? `avatar-source.${selected.mimeType?.split("/")[1] ?? "jpg"}`,
      type: selected.mimeType ?? "image/jpeg",
      uri: selected.uri,
    });
  }

  function updateAvatar(action: { mutate: typeof mutations.approveMutation.mutate }) {
    if (!displayedAvatar) return;
    mutations.resetErrors();
    action.mutate(displayedAvatar.id, { onSuccess: setActiveAvatar });
  }

  function confirmDelete() {
    if (!displayedAvatar) return;
    mutations.resetErrors();
    const needsSourcePhoto = displayedAvatar.failure_code === "source_image_required";
    Alert.alert(
      needsSourcePhoto
        ? phrase("copy_419975a812a2", arabic)
        : phrase("copy_8182491de279", arabic),
      needsSourcePhoto
        ? phrase("copy_c54487b118ac", arabic)
        : phrase("copy_f0d690c37f80", arabic),
      [
        { text: phrase("copy_428808b5e23b", arabic), style: "cancel" },
        {
          text: phrase("copy_0104911cfea6", arabic),
          style: "destructive",
          onPress: () =>
            mutations.deleteMutation.mutate(displayedAvatar.id, {
              onSuccess: () => setActiveAvatar(null),
            }),
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={phrase("copy_2a52671ad634", arabic)}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backLabel}>{phrase("copy_436170a81a03", arabic)}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.heading}>
            {phrase("copy_c05fd35f7778", arabic)}
          </Text>
          <View style={styles.headerBalance} />
        </View>

        <View accessibilityLabel={t("characterProgress")} style={{gap: 8, paddingVertical: 8, flexDirection: arabic ? "row-reverse" : "row", alignItems: "center"}}><View style={{flex: 1, gap: 4}}>
          {game.data ? <><Text style={[styles.privacyCopy, {marginBottom: 0}]}>{t("level")} {formatNumber(game.data.level, locale)} · {formatNumber(game.data.xp, locale)} {t("xp")}</Text><Text style={[styles.privacyCopy, {marginBottom: 0}]}>{game.data.badges.length ? game.data.badges.map(badge => t(badge as MessageKey)).join(" · ") : t("noBadges")}</Text></> : game.isError ? <AvatarButton tone="secondary" onPress={() => void game.refetch()}>{t("retry")}</AvatarButton> : <Text style={styles.privacyCopy}>{t("loading")}</Text>}
          </View><Pressable accessibilityRole="button" onPress={() => router.push("/missions")} style={{minHeight: 48, justifyContent: "center", paddingHorizontal: 8}}><Text style={styles.retryLabel}>{t("weeklyMission")}</Text></Pressable>
        </View>
        <View style={styles.privateBadge}><Text style={styles.privateBadgeText}>{phrase("copy_f06d7f4640d5", arabic)}</Text></View>

        {!activeAvatar && avatarsQuery.isPending ? (
          <View accessibilityLabel={phrase("copy_b3ecef7bdba7", arabic)} style={styles.queryStatePanel}>
            <ActivityIndicator color={colors.bronze} size="large" />
            <Text style={styles.queryStateTitle}>{phrase("copy_cffeb59a4687", arabic)}</Text>
            <Text style={styles.queryStateCopy}>
              {phrase("copy_9f99cd3b6120", arabic)}
            </Text>
          </View>
        ) : !activeAvatar && avatarsQuery.isError && !avatarsQuery.data ? (
          <View accessibilityRole="alert" style={styles.queryStatePanel}>
            <Text style={styles.queryStateTitle}>{phrase("copy_a53ab480e532", arabic)}</Text>
            <Text style={styles.queryStateCopy}>
              {phrase("copy_f64f77ca3e1d", arabic)}
            </Text>
            <AvatarButton onPress={() => void avatarsQuery.refetch()} tone="secondary">
              {phrase("copy_0d7b38c28dab", arabic)}
            </AvatarButton>
          </View>
        ) : buildStage ? (
          <AvatarBuildProgress arabic={arabic} stage={buildStage} />
        ) : displayedAvatar ? (
          <AvatarReview
            avatar={displayedAvatar}
            confirmDelete={confirmDelete}
            onDeleteSourcePhoto={uploadedSourcePhotoId ? () => {
              mutations.deleteSourcePhotoMutation.mutate(uploadedSourcePhotoId, {
                onSuccess: () => setUploadedSourcePhotoId(null),
              });
            } : undefined}
            pending={pending}
            setActiveAvatar={setActiveAvatar}
            onCreateNew={() => { setSourcePhoto(null); setCreateNewVersion(true); }}
            onUpdateMeasurements={() => router.push("/profile")}
            latestMeasurementsAt={measurementQuery.data?.recorded_at ?? null}
            sourcePhoto={sourcePhoto}
            updateAvatar={updateAvatar}
            mutations={mutations}
            arabic={arabic}
          />
        ) : (
          <View style={styles.creationSection}>
            <View style={{alignItems: "center", justifyContent: "center", gap: 12, padding: 16, minHeight: 180, borderRadius: 24, backgroundColor: colors.surface}}>
              <Feather name="user" size={56} color={colors.mutedLight} />
              <Text style={[styles.previewCopy, {textAlign: "center"}]}>{t("avatarSetup")}</Text>
            </View>
            {createNewVersion ? <AvatarButton onPress={() => setCreateNewVersion(false)} tone="secondary">{phrase("copy_36d676949b08", arabic)}</AvatarButton> : null}
            <View style={styles.selectorSection}>
              <Text style={styles.selectorEyebrow}>{phrase("copy_110a4294c421", arabic)}</Text>
              <Text style={styles.selectorTitle}>{phrase("copy_b2a78c0b87c0", arabic)}</Text>
              <View accessibilityRole="radiogroup" style={styles.segmentedControl}>
                {(["men", "women"] as const).map((option) => {
                  const selected = presentation === option;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      key={option}
                      onPress={() => setPresentation(option)}
                      style={[styles.segment, selected && styles.segmentSelected]}
                    >
                      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                        {option === "men" ? (phrase("copy_611d98717a14", arabic)) : (phrase("copy_94573a479c8d", arabic))}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.selectorHelp}>
                {phrase("copy_52b3e14b6eaf", arabic)}
              </Text>
            </View>
            <MeasurementPanel arabic={arabic} query={measurementQuery} />
            <View style={styles.sourcePhotoSection}>
              <Text style={styles.selectorEyebrow}>{phrase("copy_86ef0e9a9dd1", arabic)}</Text>
              <Text style={styles.sourcePhotoTitle}>
                {sourcePhoto ? (phrase("copy_31f82e9c4139", arabic)) : (phrase("copy_6948bcd08844", arabic))}
              </Text>
              <Text style={styles.sourcePhotoHelp}>
                {phrase("copy_b76798b5bae8", arabic)}
              </Text>
              {sourcePhoto ? (
                <Image
                  accessibilityLabel={t("selectedSourcePhoto")}
                  resizeMode="cover"
                  source={{ uri: sourcePhoto.uri }}
                  style={styles.sourcePhotoPreview}
                />
              ) : null}
              <View style={styles.sourcePhotoActions}>
                <AvatarButton onPress={() => void chooseSourcePhoto(false)} tone="secondary">
                  {sourcePhoto ? (phrase("copy_1436cb3d7073", arabic)) : (phrase("copy_1d5b670fdd92", arabic))}
                </AvatarButton>
                <AvatarButton onPress={() => void chooseSourcePhoto(true)} tone="secondary">
                  {phrase("copy_986e526d8019", arabic)}
                </AvatarButton>
              </View>
            </View>
            <View style={styles.explainer}>
              <Text style={styles.explainerTitle}>{phrase("copy_fcf6baabb636", arabic)}</Text>
              <Text style={styles.explainerCopy}>
                {phrase("copy_77e39d86bce5", arabic)}
              </Text>
            </View>
            <AvatarButton
              disabled={!measurementQuery.data?.available || measurementQuery.data?.generation_enabled === false || !sourcePhoto || !photoConsent || pending}
              loading={mutations.createMutation.isPending || mutations.sourcePhotoMutation.isPending}
              onPress={generate}
            >
              {phrase("copy_f3c14001c1ad", arabic)}
            </AvatarButton>
            <Pressable accessibilityRole="checkbox" accessibilityState={{checked: photoConsent}} onPress={() => setPhotoConsent(!photoConsent)} style={{minHeight: 50, paddingVertical: 12}}><Text style={styles.explainerCopy}>{photoConsent ? "✓ " : "☐ "}{t("photoConsent")}</Text></Pressable>
            <Text style={styles.explainerCopy}>{t("illustration")}</Text>
          </View>
        )}

        <View style={styles.privacyPanel}>
          <View style={styles.privateBadge}>
            <Text style={styles.privateBadgeText}>{phrase("copy_f06d7f4640d5", arabic)}</Text>
          </View>
          <Text style={styles.privacyTitle}>{phrase("copy_99e242286cc3", arabic)}</Text>
          <Text style={styles.privacyCopy}>
            {phrase("copy_6fad82754d1b", arabic)}
          </Text>
          <PrivacyTimeline arabic={arabic} />
        </View>

        {(avatarsQuery.data?.items.length ?? 0) > 1 ? <View style={{gap: 12}}><Text style={styles.heading}>{t("avatarHistory")}</Text>{avatarsQuery.data?.items.map(version => <AvatarButton key={version.id} tone="secondary" onPress={() => {setCreateNewVersion(false); setActiveAvatar(version);}}>{formatDate(version.created_at, arabic)} · {avatarStateTitle(version, arabic)}</AvatarButton>)}</View> : null}
        <AvatarButton tone="secondary" onPress={() => router.push("/inbody/progress")}>{t("bodyProfile")}</AvatarButton>
        <Text style={styles.previewCopy}>{t("characterEvidence")}</Text>
        <AvatarButton tone="secondary" onPress={() => router.push("/progress-score")}>{t("progressScore")}</AvatarButton>
        <AvatarButton tone="secondary" onPress={() => router.push("/privacy")}>{t("privacySettings")}</AvatarButton>
        {measurementQuery.data?.generation_enabled === false ? <Text style={styles.previewCopy}>{t("avatar_generation_disabled")}</Text> : null}
        {mutationError ? (
          <View accessibilityRole="alert" style={styles.errorPanel}>
            <Text style={styles.errorTitle}>{phrase("copy_6b3d12ab0228", arabic)}</Text>
            <Text style={styles.errorCopy}>{mutationError}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

type MeasurementPanelProps = {
  arabic: boolean;
  query: ReturnType<typeof useAvatarMeasurementStatus>;
};

function MeasurementPanel({ arabic, query }: MeasurementPanelProps) {
  const [showManualForm, setShowManualForm] = useState(false);

  if (query.isPending) {
    return (
      <View accessibilityLabel={phrase("copy_8f7534f3f496", arabic)} style={styles.measurementPanel}>
        <ActivityIndicator color={colors.bronze} />
        <View style={styles.measurementCopy}>
          <Text style={styles.measurementTitle}>{phrase("copy_335eefd1223d", arabic)}</Text>
          <Text style={styles.measurementDetail}>{phrase("copy_744ba32d0d2b", arabic)}</Text>
        </View>
      </View>
    );
  }
  if (query.isError) {
    return (
      <View accessibilityRole="alert" style={styles.measurementPanel}>
        <View style={styles.measurementCopy}>
          <Text style={styles.measurementTitle}>{phrase("copy_254767833e08", arabic)}</Text>
          <Text style={styles.measurementDetail}>{phrase("copy_d392d7533717", arabic)}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
          <Text style={styles.retryLabel}>{phrase("copy_bb30cda7c34e", arabic)}</Text>
        </Pressable>
      </View>
    );
  }
  if (!query.data?.available) {
    return (
      <View style={styles.measurementSourceSection}>
        <View style={styles.measurementPanel}>
          <View style={styles.measurementCopy}>
            <Text style={styles.measurementTitle}>{phrase("copy_e7bf15012528", arabic)}</Text>
            <Text style={styles.measurementDetail}>
              {phrase("copy_42a0ced24ef7", arabic)}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
            <Text style={styles.retryLabel}>{phrase("copy_0884436f7af9", arabic)}</Text>
          </Pressable>
        </View>
        <ManualMeasurementsForm arabic={arabic} onSaved={() => void query.refetch()} />
      </View>
    );
  }

  const fields = [
    phrase("copy_19301b5212ba", arabic),
    phrase("copy_f2d1e4db833a", arabic),
    query.data.body_fat_available ? phrase("copy_179df426220f", arabic) : null,
    query.data.muscle_mass_available ? phrase("copy_f539c6095891", arabic) : null,
  ].filter((field): field is string => field !== null);
  return (
    <View style={styles.measurementSourceSection}>
      <View style={styles.measurementReadyPanel}>
        <View style={styles.measurementReadyHeader}>
          <View style={styles.readyDot} />
          <Text style={styles.readyLabel}>
            {query.data.source === "inbody" ? (phrase("copy_4c978e0766a1", arabic)) : (phrase("copy_cc36cecec3da", arabic))}
          </Text>
        </View>
        <Text style={styles.measurementReadyTitle}>{phrase("copy_eabc10742329", arabic)}</Text>
        <View style={styles.shapeRow}>
          <Text style={styles.shapeLabel}>{phrase("copy_3fb3e0b5eb43", arabic)}</Text>
          <Text style={styles.shapeValue}>
            {query.data.shape_profile ? shapeLabel(query.data.shape_profile, arabic) : phrase("copy_fe799fe53d93", arabic)}
          </Text>
        </View>
        <View style={styles.fieldRow}>
          {fields.map((field) => (
            <View key={field} style={styles.fieldChip}>
              <Text style={styles.fieldChipText}>{field}</Text>
            </View>
          ))}
        </View>
        {query.data.recorded_at ? (
          <Text style={styles.recordedAt}>{phraseTemplate("copy_833b5eb3e2e3", arabic, (arabic) ? [formatDate(query.data.recorded_at, true)] : [formatDate(query.data.recorded_at, false)])}</Text>
        ) : null}
        <Text style={styles.sourceRule}>{phrase("copy_9708ccb57d5d", arabic)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setShowManualForm((current) => !current)}
        style={styles.manualAction}
      >
        <Text style={styles.manualActionText}>
          {showManualForm
            ? phrase("copy_06aa5ac9508b", arabic)
            : query.data.source === "profile"
              ? phrase("copy_31935170b169", arabic)
              : phrase("copy_33282c155282", arabic)}
        </Text>
      </Pressable>
      {showManualForm ? (
        <ManualMeasurementsForm
          arabic={arabic}
          onCancel={() => setShowManualForm(false)}
          onSaved={() => {
            setShowManualForm(false);
            void query.refetch();
          }}
        />
      ) : null}
    </View>
  );
}

type AvatarReviewProps = {
  arabic: boolean;
  avatar: AvatarView;
  confirmDelete: () => void;
  latestMeasurementsAt: string | null;
  onCreateNew: () => void;
  pending: boolean;
  setActiveAvatar: (avatar: AvatarView) => void;
  onUpdateMeasurements: () => void;
  sourcePhoto: LocalAvatarSourcePhoto | null;
  updateAvatar: (action: { mutate: ReturnType<typeof useAvatarMutations>["approveMutation"]["mutate"] }) => void;
  mutations: ReturnType<typeof useAvatarMutations>;
  onDeleteSourcePhoto?: () => void;
};

function AvatarReview({
  arabic,
  avatar,
  confirmDelete,
  latestMeasurementsAt,
  onCreateNew,
  pending,
  setActiveAvatar,
  onUpdateMeasurements,
  sourcePhoto,
  updateAvatar,
  mutations,
  onDeleteSourcePhoto,
}: AvatarReviewProps) {
  const {t} = useLocale();
  const renewal = avatarRenewalStatus(avatar.measurements_recorded_at, latestMeasurementsAt);
  return (
    <View style={styles.previewSection}>
      {avatar.preview_url ? (
        <View style={styles.portraitReview}>
          <Image
            accessibilityLabel={phrase("copy_37df4f84a2f3", arabic)}
            resizeMode="contain"
            source={{ uri: avatar.preview_url }}
            style={styles.generatedPortrait}
          />
          <Text style={styles.portraitStatus}>
            {avatar.public_in_community ? (phrase("copy_d4927c3c5f42", arabic)) : (phrase("copy_aa392cd97ff1", arabic))}
          </Text>
          {sourcePhoto ? <View style={styles.identityComparison}>
            <Image
              accessibilityLabel={phrase("copy_ef6a059d2968", arabic)}
              resizeMode="cover"
              source={{ uri: sourcePhoto.uri }}
              style={styles.identityReference}
            />
            <View style={styles.identityComparisonCopy}>
              <Text style={styles.identityComparisonTitle}>{phrase("copy_306781c3bf59", arabic)}</Text>
              <Text style={styles.identityComparisonDetail}>{phrase("copy_f07604bc9e7c", arabic)}</Text>
            </View>
          </View> : null}
        </View>
      ) : (
        <View accessibilityLabel={phrase("copy_1cb72d602af8", arabic)} style={styles.statusPanel}>
          {avatar.state === "processing" ? (
            <ActivityIndicator color={colors.bronze} size="large" />
          ) : null}
          <Text style={styles.statusLabel}>
            {avatar.state === "failed" ? (phrase("copy_269e80c5000d", arabic)) : (phrase("copy_f89bb24b2306", arabic))}
          </Text>
        </View>
      )}
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>{phrase("copy_f15decfef8aa", arabic)}</Text>
        <View style={styles.sourceDot} />
        <Text style={styles.sourceLabel}>
          {avatar.measurement_source === "inbody" ? "INBODY" : phrase("copy_74105421148d", arabic)}
        </Text>
        <Text style={styles.sourceDate}>{formatDate(avatar.measurements_recorded_at, arabic)}</Text>
      </View>
      <Text style={styles.previewCopy}>{t("illustration")}</Text>
      <Text style={styles.previewCopy}>{t("illustrationUncertainty")}</Text>
      {avatar.development_mock ? <Text accessibilityRole="alert" style={styles.previewCopy}>{t("developmentAvatar")}</Text> : null}
      <Text style={styles.sourceDate}>{t("measurementDate")}: {avatar.measurement_snapshot?.measurement_date ? formatDate(`${avatar.measurement_snapshot.measurement_date}T12:00:00Z`, arabic) : t("unknown")}</Text>
      <Text style={styles.sourceDate}>{t("measurementDevice")}: {avatar.measurement_snapshot?.device_label ?? t("unknown")} · {t("measurementVersion")}: {avatar.measurement_snapshot?.measurement_version ?? "—"}</Text>
      <View style={styles.shapeSummary}>
        <Text style={styles.shapeSummaryLabel}>{phrase("copy_281576819055", arabic)}</Text>
        <Text style={styles.shapeSummaryValue}>{shapeLabel(avatar.shape_profile, arabic)}</Text>
        <Text style={styles.shapeSummaryMeta}>{phraseTemplate("copy_9ec399c6ccab", arabic, (arabic) ? [avatar.presentation === "men" ? "رجالي" : "نسائي"] : [titleCase(avatar.presentation)])}</Text>
      </View>
      <Text style={styles.previewTitle}>{avatarStateTitle(avatar, arabic)}</Text>
      <Text style={styles.previewCopy}>{avatarStateCopy(avatar, arabic)}</Text>

      {avatar.state === "ready_for_review" ? (
        <View style={styles.actionStack}>
          <AvatarButton
            disabled={pending && !mutations.approveMutation.isPending}
            loading={mutations.approveMutation.isPending}
            onPress={() => updateAvatar(mutations.approveMutation)}
          >
            {phrase("copy_5bdec0bde691", arabic)}
          </AvatarButton>
          <View style={styles.actionRow}>
            <View style={styles.actionHalf}>
              <AvatarButton
                disabled={pending && !mutations.regenerateMutation.isPending}
                loading={mutations.regenerateMutation.isPending}
                onPress={() => updateAvatar(mutations.regenerateMutation)}
                tone="secondary"
              >
                {phrase("copy_26dd0deaec0c", arabic)}
              </AvatarButton>
            </View>
            <View style={styles.actionHalf}>
              <AvatarButton
                disabled={pending && !mutations.rejectMutation.isPending}
                loading={mutations.rejectMutation.isPending}
                onPress={() => updateAvatar(mutations.rejectMutation)}
                tone="secondary"
              >
                {phrase("copy_62eef33c4b1b", arabic)}
              </AvatarButton>
            </View>
          </View>
        </View>
      ) : null}

      {avatar.approved ? (
        <View style={styles.renewalPanel}>
          <Text style={styles.communityTitle}>{renewal === "new_measurements" ? (phrase("copy_e0e5441f0801", arabic)) : renewal === "reassessment_due" ? (phrase("copy_e789a0d55eba", arabic)) : (phrase("copy_21925c7736ce", arabic))}</Text>
          <Text style={styles.communityDetail}>{renewal === "new_measurements" ? (phrase("copy_53ee99682f61", arabic)) : renewal === "reassessment_due" ? (phrase("copy_4c8ca42d6d2c", arabic)) : (phrase("copy_bdce5a9f8bc0", arabic))}</Text>
          {renewal === "new_measurements" ? <AvatarButton disabled={pending} onPress={() => updateAvatar(mutations.regenerateMutation)} tone="secondary">{phrase("copy_43d87c1492f9", arabic)}</AvatarButton> : null}
          {renewal === "reassessment_due" ? <AvatarButton onPress={onUpdateMeasurements} tone="secondary">{phrase("copy_014e9f43fff6", arabic)}</AvatarButton> : null}
        </View>
      ) : null}

      {avatar.approved ? (
        <View style={styles.communityControl}>
          <View style={styles.communityCopy}>
            <Text style={styles.communityTitle}>{phrase("copy_81534fa73988", arabic)}</Text>
            <Text style={styles.communityDetail}>
              {phrase("copy_855e3a065a0c", arabic)}
            </Text>
          </View>
          <Switch
            accessibilityLabel={phrase("copy_ea1d514b8dfd", arabic)}
            disabled={pending || avatar.development_mock}
            onValueChange={(enabled) => {
              mutations.resetErrors();
              mutations.communityUseMutation.mutate(
                { avatarId: avatar.id, enabled },
                { onSuccess: setActiveAvatar },
              );
            }}
            thumbColor={colors.text}
            trackColor={{ false: colors.line, true: colors.bronzeBorder }}
            value={avatar.public_in_community}
          />
        </View>
      ) : null}

      {onDeleteSourcePhoto ? (
        <View style={styles.sourcePrivacyControl}>
          <Text style={styles.communityTitle}>{phrase("copy_12ab6efb8a43", arabic)}</Text>
          <Text style={styles.communityDetail}>
            {phrase("copy_dc7395987196", arabic)}
          </Text>
          <AvatarButton
            disabled={pending && !mutations.deleteSourcePhotoMutation.isPending}
            loading={mutations.deleteSourcePhotoMutation.isPending}
            onPress={onDeleteSourcePhoto}
            tone="secondary"
          >
            {phrase("copy_82d8daf04dee", arabic)}
          </AvatarButton>
        </View>
      ) : null}

      <AvatarButton disabled={pending} onPress={onCreateNew} tone="secondary">
        {phrase("copy_722f9d47a1eb", arabic)}
      </AvatarButton>

      {(avatar.state === "failed" && avatar.failure_code !== "source_image_required") ||
      avatar.state === "rejected" ? (
        <AvatarButton
          disabled={pending && !mutations.regenerateMutation.isPending}
          loading={mutations.regenerateMutation.isPending}
          onPress={() => updateAvatar(mutations.regenerateMutation)}
        >
          {phrase("copy_32b1b028c57a", arabic)}
        </AvatarButton>
      ) : null}

      <AvatarButton disabled={pending} onPress={confirmDelete} tone="danger">
        {avatar.failure_code === "source_image_required"
          ? phrase("copy_d2fac2d266b6", arabic)
          : phrase("copy_59147eb829df", arabic)}
      </AvatarButton>
    </View>
  );
}

function avatarStateTitle(avatar: AvatarView, arabic: boolean): string {
  if (avatar.state === "approved") return phrase("copy_9446c8457d60", arabic);
  if (avatar.state === "rejected") return phrase("copy_2848900658ce", arabic);
  if (avatar.state === "failed") return phrase("copy_cf4f1cd9c097", arabic);
  if (avatar.state === "processing" || avatar.state === "requested") {
    return phrase("copy_69963d816b73", arabic);
  }
  return phrase("copy_19e41ce90d10", arabic);
}

function avatarStateCopy(avatar: AvatarView, arabic: boolean): string {
  if (avatar.state === "approved") {
    return phrase("copy_51f7a7752fc3", arabic);
  }
  if (avatar.state === "rejected") {
    return phrase("copy_5b87ece5f5f0", arabic);
  }
  if (avatar.state === "failed") {
    if (avatar.failure_code === "source_image_required") {
      return phrase("copy_b0d65becae81", arabic);
    }
    return phrase("copy_90f7a748cbae", arabic);
  }
  if (avatar.state === "processing" || avatar.state === "requested") {
    return phrase("copy_e3859e508afb", arabic);
  }
  return phrase("copy_162c009deb07", arabic);
}

function formatDate(value: string, arabic = false): string {
  return new Intl.DateTimeFormat(arabic ? "ar-EG" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function shapeLabel(value: string, arabic: boolean): string {
  if (!arabic) return titleCase(value);
  return ({ skinny: "نحيف جدًا", slim: "نحيف", normal: "متوسط", fit: "رياضي", strong: "قوي", full: "ممتلئ" } as Record<string, string>)[value] ?? value;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: 620,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    width: "100%",
  },
  header: { alignItems: "center", flexDirection: "row", minHeight: 48 },
  backButton: { justifyContent: "center", minHeight: 48, minWidth: 64 },
  backLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  heading: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  headerBalance: { width: 64 },
  privacyPanel: {
    backgroundColor: colors.bronzeSoft,
    borderRadius: radii.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  privateBadge: {
    alignSelf: "flex-start",
    borderColor: colors.bronzeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  privateBadgeText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  privacyTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  privacyCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  queryStatePanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  queryStateTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 20,
    textAlign: "center",
  },
  queryStateCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  creationSection: { gap: spacing.md },
  selectorSection: { gap: spacing.sm },
  selectorEyebrow: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  selectorTitle: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 20 },
  segmentedControl: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4,
  },
  segment: { alignItems: "center", borderRadius: radii.control, flex: 1, padding: spacing.sm },
  segmentSelected: { backgroundColor: colors.bronzeSoft },
  segmentText: { color: colors.mutedLight, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  segmentTextSelected: { color: colors.bronze },
  selectorHelp: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 16 },
  shapeScale: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  shapeScaleHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shapeScaleHint: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
  shapeScaleOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  shapeScaleChip: {
    borderColor: colors.bronzeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  shapeScaleChipSelected: {
    backgroundColor: colors.bronzeSoft,
    borderColor: colors.bronze,
  },
  shapeScaleChipText: { color: colors.mutedLight, fontFamily: fonts.bodyMedium, fontSize: 11 },
  shapeScaleChipTextSelected: { color: colors.bronze, fontFamily: fonts.bodySemiBold },
  measurementPanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 94,
    padding: spacing.md,
  },
  measurementCopy: { flex: 1 },
  measurementTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  measurementDetail: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  retryLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  measurementSourceSection: { gap: spacing.sm },
  sourcePhotoSection: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  sourcePhotoTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 18,
  },
  sourcePhotoHelp: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  sourcePhotoPreview: {
    aspectRatio: 1,
    borderRadius: radii.control,
    marginVertical: spacing.xs,
    width: "100%",
  },
  sourcePhotoActions: {
    gap: spacing.sm,
  },
  measurementReadyPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.bronzeBorder,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  measurementReadyHeader: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  readyDot: { backgroundColor: colors.bronze, borderRadius: 5, height: 9, width: 9 },
  readyLabel: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  measurementReadyTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 18,
  },
  shapeRow: { alignItems: "baseline", flexDirection: "row", gap: spacing.sm },
  shapeLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1.1 },
  shapeValue: { color: colors.mutedLight, fontFamily: fonts.bodyMedium, fontSize: 12 },
  fieldRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  fieldChip: {
    backgroundColor: colors.bronzeSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  fieldChipText: { color: colors.mutedLight, fontFamily: fonts.bodyMedium, fontSize: 11 },
  recordedAt: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  sourceRule: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15 },
  manualAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  manualActionText: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  explainer: {
    backgroundColor: colors.bronzeSoft,
    borderColor: colors.bronzeBorder,
    borderRadius: radii.control,
    borderWidth: 1,
    padding: spacing.md,
  },
  explainerTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  explainerCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  previewSection: { gap: spacing.md },
  portraitReview: { gap: spacing.sm },
  generatedPortrait: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    width: "100%",
  },
  portraitStatus: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textAlign: "center",
  },
  identityComparison: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  identityReference: { borderRadius: radii.control, height: 76, width: 76 },
  identityComparisonCopy: { flex: 1 },
  identityComparisonTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  identityComparisonDetail: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  statusPanel: {
    alignItems: "center",
    aspectRatio: 2 / 3,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    justifyContent: "center",
    width: "100%",
  },
  statusLabel: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  sourceLine: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  sourceDot: { backgroundColor: colors.line, borderRadius: 2, height: 4, width: 4 },
  sourceLabel: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  sourceDate: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  shapeSummary: {
    alignItems: "baseline",
    backgroundColor: colors.bronzeSoft,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  shapeSummaryLabel: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1.1 },
  shapeSummaryValue: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 18 },
  shapeSummaryMeta: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 12 },
  previewTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  previewCopy: { color: colors.mutedLight, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  actionStack: { gap: spacing.sm },
  actionRow: { flexDirection: "row", gap: spacing.sm },
  actionHalf: { flex: 1 },
  communityControl: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 82,
    padding: spacing.md,
  },
  renewalPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  sourcePrivacyControl: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  communityCopy: { flex: 1 },
  communityTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  communityDetail: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  errorPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderRadius: radii.control,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  errorCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
});
