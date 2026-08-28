import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { AvatarButton } from "../components/AvatarButton";
import { AvatarBuildProgress } from "../components/AvatarBuildProgress";
import { BodyFigurePreview } from "../components/BodyFigurePreview";
import { GameAvatar3D } from "../components/GameAvatar3D";
import { ManualMeasurementsForm } from "../components/ManualMeasurementsForm";
import { PrivacyTimeline } from "../components/PrivacyTimeline";
import {
  useAvatarMeasurementStatus,
  useAvatarMutations,
  useAvatars,
} from "../hooks";
import type { AvatarPresentation, AvatarView, BodyShapeProfile } from "../types";

type AvatarScreenProps = {
  onBack: () => void;
};

const shapeProfiles: { label: string; value: BodyShapeProfile }[] = [
  { label: "Skinny", value: "skinny" },
  { label: "Slim", value: "slim" },
  { label: "Normal", value: "normal" },
  { label: "Fit", value: "fit" },
  { label: "Strong", value: "strong" },
  { label: "Full", value: "full" },
];

export function AvatarScreen({ onBack }: AvatarScreenProps) {
  const [presentation, setPresentation] = useState<AvatarPresentation>("men");
  const avatarsQuery = useAvatars();
  const measurementQuery = useAvatarMeasurementStatus(presentation);
  const mutations = useAvatarMutations();
  const [activeAvatar, setActiveAvatar] = useState<AvatarView | null>(null);
  const [previewChoice, setPreviewChoice] = useState<{
    presentation: AvatarPresentation;
    shape: BodyShapeProfile;
  } | null>(null);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStage, setBuildStage] = useState("");
  const buildTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const buildStartedAt = useRef(0);
  const previewShape =
    previewChoice?.presentation === presentation
      ? previewChoice.shape
      : (measurementQuery.data?.shape_profile ?? "normal");

  useEffect(
    () => () => {
      buildTimers.current.forEach(clearTimeout);
    },
    [],
  );

  const displayedAvatar = activeAvatar ?? avatarsQuery.data?.items[0] ?? null;
  const pending =
    mutations.createMutation.isPending ||
    mutations.approveMutation.isPending ||
    mutations.rejectMutation.isPending ||
    mutations.regenerateMutation.isPending ||
    mutations.communityUseMutation.isPending ||
    mutations.deleteMutation.isPending;
  const mutationError = useMemo(() => {
    const error = [
      mutations.createMutation.error,
      mutations.approveMutation.error,
      mutations.rejectMutation.error,
      mutations.regenerateMutation.error,
      mutations.communityUseMutation.error,
      mutations.deleteMutation.error,
    ].find(Boolean);
    return error instanceof Error ? error.message : null;
  }, [mutations]);

  function generate() {
    mutations.resetErrors();
    buildTimers.current.forEach(clearTimeout);
    buildTimers.current = [];
    buildStartedAt.current = Date.now();
    setBuildProgress(12);
    setBuildStage("Reading confirmed measurements");
    const schedule = (delay: number, action: () => void) => {
      buildTimers.current.push(setTimeout(action, delay));
    };
    schedule(450, () => {
      setBuildProgress(38);
      setBuildStage("Calculating body proportions");
    });
    schedule(900, () => {
      setBuildProgress(68);
      setBuildStage("Rigging your 3D body");
    });
    schedule(1350, () => {
      setBuildProgress(86);
      setBuildStage("Waiting for the private render");
    });
    mutations.createMutation.mutate(
      { style: "cinematic_3d", presentation },
      {
        onError: () => {
          buildTimers.current.forEach(clearTimeout);
          setBuildProgress(0);
        },
        onSuccess: (avatar) => {
          if (avatar.state === "failed") {
            buildTimers.current.forEach(clearTimeout);
            setBuildProgress(0);
            setActiveAvatar(avatar);
            return;
          }
          const finishDelay = Math.max(0, 1500 - (Date.now() - buildStartedAt.current));
          schedule(finishDelay, () => {
            setBuildProgress(100);
            setBuildStage("Avatar ready to explore");
            schedule(380, () => {
              setActiveAvatar(avatar);
              setBuildProgress(0);
            });
          });
        },
      },
    );
  }

  function updateAvatar(action: { mutate: typeof mutations.approveMutation.mutate }) {
    if (!displayedAvatar) return;
    mutations.resetErrors();
    action.mutate(displayedAvatar.id, { onSuccess: setActiveAvatar });
  }

  function confirmDelete() {
    if (!displayedAvatar) return;
    mutations.resetErrors();
    Alert.alert(
      "Delete body avatar?",
      "This removes the generated figure. Your InBody report and profile measurements stay unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
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
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.heading}>
            Body avatar
          </Text>
          <View style={styles.headerBalance} />
        </View>

        <View style={styles.privacyPanel}>
          <View style={styles.privateBadge}>
            <Text style={styles.privateBadgeText}>NO BODY PHOTO NEEDED</Text>
          </View>
          <Text style={styles.privacyTitle}>Built from your confirmed data.</Text>
          <Text style={styles.privacyCopy}>
            BONYAN uses height, weight, body-fat and muscle data when available to estimate a
            respectful full-body figure. Raw measurements never appear in the community.
          </Text>
          <PrivacyTimeline />
        </View>

        {!activeAvatar && avatarsQuery.isPending ? (
          <View accessibilityLabel="Loading saved body avatars" style={styles.queryStatePanel}>
            <ActivityIndicator color={colors.bronze} size="large" />
            <Text style={styles.queryStateTitle}>Checking your private avatars</Text>
            <Text style={styles.queryStateCopy}>
              Your saved review and community settings are loading.
            </Text>
          </View>
        ) : !activeAvatar && avatarsQuery.isError && !avatarsQuery.data ? (
          <View accessibilityRole="alert" style={styles.queryStatePanel}>
            <Text style={styles.queryStateTitle}>Your body avatars could not load</Text>
            <Text style={styles.queryStateCopy}>
              No privacy state changed. Reconnect before generating another version.
            </Text>
            <AvatarButton onPress={() => void avatarsQuery.refetch()} tone="secondary">
              Try again
            </AvatarButton>
          </View>
        ) : buildProgress > 0 ? (
          <AvatarBuildProgress progress={buildProgress} stage={buildStage} />
        ) : displayedAvatar ? (
          <AvatarReview
            avatar={displayedAvatar}
            confirmDelete={confirmDelete}
            pending={pending}
            setActiveAvatar={setActiveAvatar}
            updateAvatar={updateAvatar}
            mutations={mutations}
          />
        ) : (
          <View style={styles.creationSection}>
            <View style={styles.selectorSection}>
              <Text style={styles.selectorEyebrow}>AVATAR FRAME</Text>
              <Text style={styles.selectorTitle}>Choose the figure that represents you</Text>
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
                        {option === "men" ? "Men" : "Women"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.selectorHelp}>
                This changes the avatar model only. Your health data stays unchanged.
              </Text>
            </View>
            <BodyFigurePreview presentation={presentation} shape={previewShape} />
            <View style={styles.shapeScale}>
              <View style={styles.shapeScaleHeader}>
                <Text style={styles.selectorEyebrow}>PREVIEW THE BODY SPECTRUM</Text>
                <Text style={styles.shapeScaleHint}>Final shape comes from your measurements</Text>
              </View>
              <View style={styles.shapeScaleOptions}>
                {shapeProfiles.map((shape) => (
                  <Pressable
                    accessibilityLabel={`Preview ${shape.label} body shape`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: previewShape === shape.value }}
                    key={shape.value}
                    onPress={() => setPreviewChoice({ presentation, shape: shape.value })}
                    style={[
                      styles.shapeScaleChip,
                      previewShape === shape.value && styles.shapeScaleChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.shapeScaleChipText,
                        previewShape === shape.value && styles.shapeScaleChipTextSelected,
                      ]}
                    >
                      {shape.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <MeasurementPanel query={measurementQuery} />
            <View style={styles.explainer}>
              <Text style={styles.explainerTitle}>A visual estimate—not a diagnosis</Text>
              <Text style={styles.explainerCopy}>
                Body shape varies beyond what measurements can capture. The avatar shows broad
                proportions only and never invents medical results.
              </Text>
            </View>
            <AvatarButton
              disabled={!measurementQuery.data?.available || pending}
              loading={mutations.createMutation.isPending}
              onPress={generate}
            >
              Build Cinematic 3D avatar
            </AvatarButton>
          </View>
        )}

        {mutationError ? (
          <View accessibilityRole="alert" style={styles.errorPanel}>
            <Text style={styles.errorTitle}>Something needs attention</Text>
            <Text style={styles.errorCopy}>{mutationError}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

type MeasurementPanelProps = {
  query: ReturnType<typeof useAvatarMeasurementStatus>;
};

function MeasurementPanel({ query }: MeasurementPanelProps) {
  const [showManualForm, setShowManualForm] = useState(false);

  if (query.isPending) {
    return (
      <View accessibilityLabel="Checking body data" style={styles.measurementPanel}>
        <ActivityIndicator color={colors.bronze} />
        <View style={styles.measurementCopy}>
          <Text style={styles.measurementTitle}>Checking confirmed body data</Text>
          <Text style={styles.measurementDetail}>Looking for your latest InBody result.</Text>
        </View>
      </View>
    );
  }
  if (query.isError) {
    return (
      <View accessibilityRole="alert" style={styles.measurementPanel}>
        <View style={styles.measurementCopy}>
          <Text style={styles.measurementTitle}>Body data could not load</Text>
          <Text style={styles.measurementDetail}>Nothing was generated. Reconnect and retry.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  if (!query.data?.available) {
    return (
      <View style={styles.measurementSourceSection}>
        <View style={styles.measurementPanel}>
          <View style={styles.measurementCopy}>
            <Text style={styles.measurementTitle}>Choose your measurement source</Text>
            <Text style={styles.measurementDetail}>
              Complete an InBody scan, or enter confirmed measurements below.
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
            <Text style={styles.retryLabel}>Check InBody</Text>
          </Pressable>
        </View>
        <ManualMeasurementsForm onSaved={() => void query.refetch()} />
      </View>
    );
  }

  const fields = [
    "Height",
    "Weight",
    query.data.body_fat_available ? "Body fat" : null,
    query.data.muscle_mass_available ? "Muscle mass" : null,
  ].filter((field): field is string => field !== null);
  return (
    <View style={styles.measurementSourceSection}>
      <View style={styles.measurementReadyPanel}>
        <View style={styles.measurementReadyHeader}>
          <View style={styles.readyDot} />
          <Text style={styles.readyLabel}>
            {query.data.source === "inbody" ? "LATEST INBODY READY" : "MANUAL DATA READY"}
          </Text>
        </View>
        <Text style={styles.measurementReadyTitle}>Enough data to shape your avatar</Text>
        <View style={styles.shapeRow}>
          <Text style={styles.shapeLabel}>CALCULATED SHAPE</Text>
          <Text style={styles.shapeValue}>
            {query.data.shape_profile ? titleCase(query.data.shape_profile) : "Ready after build"}
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
          <Text style={styles.recordedAt}>Recorded {formatDate(query.data.recorded_at)}</Text>
        ) : null}
        <Text style={styles.sourceRule}>The most recently confirmed source is used.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setShowManualForm((current) => !current)}
        style={styles.manualAction}
      >
        <Text style={styles.manualActionText}>
          {showManualForm
            ? "Keep current source"
            : query.data.source === "profile"
              ? "Update manual measurements"
              : "Use manual measurements instead"}
        </Text>
      </Pressable>
      {showManualForm ? (
        <ManualMeasurementsForm
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
  avatar: AvatarView;
  confirmDelete: () => void;
  pending: boolean;
  setActiveAvatar: (avatar: AvatarView) => void;
  updateAvatar: (action: { mutate: ReturnType<typeof useAvatarMutations>["approveMutation"]["mutate"] }) => void;
  mutations: ReturnType<typeof useAvatarMutations>;
};

function AvatarReview({
  avatar,
  confirmDelete,
  pending,
  setActiveAvatar,
  updateAvatar,
  mutations,
}: AvatarReviewProps) {
  return (
    <View style={styles.previewSection}>
      {avatar.preview_url ? (
        <View style={styles.gamePreview}>
          <GameAvatar3D presentation={avatar.presentation} shape={avatar.shape_profile} />
          <Text style={styles.gamePreviewStatus}>
            {avatar.public_in_community ? "COMMUNITY ENABLED" : "PRIVATE · DRAG TO ROTATE"}
          </Text>
          <View style={styles.communityPortrait}>
            <Image
              accessibilityLabel="Private community portrait preview"
              resizeMode="cover"
              source={{ uri: avatar.preview_url }}
              style={styles.communityPortraitImage}
            />
            <View style={styles.communityPortraitCopy}>
              <Text style={styles.communityPortraitTitle}>Community portrait</Text>
              <Text style={styles.communityPortraitDetail}>
                This private 2D portrait is the version shown beside posts. Approving saves it
                together with your interactive 3D body.
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View accessibilityLabel="Body avatar generation status" style={styles.statusPanel}>
          {avatar.state === "processing" ? (
            <ActivityIndicator color={colors.bronze} size="large" />
          ) : null}
          <Text style={styles.statusLabel}>
            {avatar.state === "failed" ? "GENERATION PAUSED" : "BUILDING BODY SHAPE"}
          </Text>
        </View>
      )}
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>CINEMATIC 3D</Text>
        <View style={styles.sourceDot} />
        <Text style={styles.sourceLabel}>
          {avatar.measurement_source === "inbody" ? "INBODY" : "PROFILE"}
        </Text>
        <Text style={styles.sourceDate}>{formatDate(avatar.measurements_recorded_at)}</Text>
      </View>
      <View style={styles.shapeSummary}>
        <Text style={styles.shapeSummaryLabel}>SHAPE</Text>
        <Text style={styles.shapeSummaryValue}>{titleCase(avatar.shape_profile)}</Text>
        <Text style={styles.shapeSummaryMeta}>{titleCase(avatar.presentation)} frame</Text>
      </View>
      <Text style={styles.previewTitle}>{avatarStateTitle(avatar)}</Text>
      <Text style={styles.previewCopy}>{avatarStateCopy(avatar)}</Text>

      {avatar.state === "ready_for_review" ? (
        <View style={styles.actionStack}>
          <AvatarButton
            disabled={pending && !mutations.approveMutation.isPending}
            loading={mutations.approveMutation.isPending}
            onPress={() => updateAvatar(mutations.approveMutation)}
          >
            Approve 3D avatar + portrait
          </AvatarButton>
          <View style={styles.actionRow}>
            <View style={styles.actionHalf}>
              <AvatarButton
                disabled={pending && !mutations.regenerateMutation.isPending}
                loading={mutations.regenerateMutation.isPending}
                onPress={() => updateAvatar(mutations.regenerateMutation)}
                tone="secondary"
              >
                Refresh from data
              </AvatarButton>
            </View>
            <View style={styles.actionHalf}>
              <AvatarButton
                disabled={pending && !mutations.rejectMutation.isPending}
                loading={mutations.rejectMutation.isPending}
                onPress={() => updateAvatar(mutations.rejectMutation)}
                tone="secondary"
              >
                Reject
              </AvatarButton>
            </View>
          </View>
        </View>
      ) : null}

      {avatar.approved ? (
        <View style={styles.communityControl}>
          <View style={styles.communityCopy}>
            <Text style={styles.communityTitle}>Use in community</Text>
            <Text style={styles.communityDetail}>
              Share this figure beside chosen posts. The measurements behind it stay private.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Use approved body avatar in community"
            disabled={pending}
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

      {avatar.state === "failed" || avatar.state === "rejected" ? (
        <AvatarButton
          disabled={pending && !mutations.regenerateMutation.isPending}
          loading={mutations.regenerateMutation.isPending}
          onPress={() => updateAvatar(mutations.regenerateMutation)}
        >
          Build from latest data
        </AvatarButton>
      ) : null}

      <AvatarButton disabled={pending} onPress={confirmDelete} tone="danger">
        Delete body avatar
      </AvatarButton>
    </View>
  );
}

function avatarStateTitle(avatar: AvatarView): string {
  if (avatar.state === "approved") return "Approved by you";
  if (avatar.state === "rejected") return "This version is rejected";
  if (avatar.state === "failed") return "The body figure did not finish";
  if (avatar.state === "processing" || avatar.state === "requested") {
    return "Shaping your private avatar";
  }
  return "Review the broad proportions";
}

function avatarStateCopy(avatar: AvatarView): string {
  if (avatar.state === "approved") {
    return "Saved privately. It appears in the community only if you enable the control below.";
  }
  if (avatar.state === "rejected") {
    return "Nothing was published. Build another version from your latest confirmed data.";
  }
  if (avatar.state === "failed") {
    return "Nothing was published. Your measurements remain available for a safe retry.";
  }
  if (avatar.state === "processing" || avatar.state === "requested") {
    return "Your raw measurements stay private while the full-body figure is created.";
  }
  return "This is an estimate from measurements, not an exact scan. Approve only if it feels right.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.canvas, flex: 1 },
  content: {
    alignSelf: "center",
    gap: spacing.lg,
    maxWidth: 620,
    padding: spacing.lg,
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
  gamePreview: { gap: spacing.sm },
  gamePreviewStatus: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textAlign: "center",
  },
  communityPortrait: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  communityPortraitImage: { borderRadius: radii.control, height: 76, width: 76 },
  communityPortraitCopy: { flex: 1 },
  communityPortraitTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  communityPortraitDetail: {
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
