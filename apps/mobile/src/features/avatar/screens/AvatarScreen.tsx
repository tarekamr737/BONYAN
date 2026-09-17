import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import * as ImagePicker from "expo-image-picker";
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

type AvatarScreenProps = {
  onBack: () => void;
};

export function AvatarScreen({ onBack }: AvatarScreenProps) {
  const arabic = useContext(LanguageDirection);
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
    if (!sourcePhoto) {
      Alert.alert(
        arabic ? "اختار صورة شخصية خاصة" : "Choose a private source photo",
        arabic ? "ضيف صورة واضحة قبل ما تنشئ صورتك." : "Add a clear photo before building your avatar.",
      );
      return;
    }
    mutations.resetErrors();
    setBuildStage(arabic ? "بنرفع صورتك الخاصة بأمان" : "Uploading your private source photo");
    mutations.sourcePhotoMutation.mutate(sourcePhoto, {
      onError: () => setBuildStage(null),
      onSuccess: (uploadedPhoto) => {
        setUploadedSourcePhotoId(uploadedPhoto.id);
        setBuildStage(arabic ? "بنجهز صورتك من ملامحك وقياساتك" : "Creating a portrait from your photo and measurements");
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
        arabic ? "محتاجين إذن الصور" : "Photo access is needed",
        arabic
          ? `اسمح لبنيان باستخدام ${fromCamera ? "الكاميرا" : "مكتبة الصور"} وبعدين جرّب تاني.`
          : `Allow BONYAN to use your ${fromCamera ? "camera" : "photo library"}, then try again.`,
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
        ? arabic ? "تحذف النسخة اللي ما اكتملتش؟" : "Delete failed version?"
        : arabic ? "تحذف صورتك؟" : "Delete body avatar?",
      needsSourcePhoto
        ? arabic ? "احذف النسخة دي، وبعدها اختار صورة خاصة واضحة. تقرير InBody مش هيتغير." : "Delete this failed version, then choose a private source photo to build your Avatar. Your InBody report stays unchanged."
        : arabic ? "ده هيحذف الصورة المتولدة بس. تقرير InBody وقياساتك هيفضلوا زي ما هم." : "This removes the generated portrait. Your InBody report and profile measurements stay unchanged.",
      [
        { text: arabic ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: arabic ? "حذف" : "Delete",
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
            accessibilityLabel={arabic ? "رجوع" : "Go back"}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={styles.backButton}
          >
            <Text style={styles.backLabel}>{arabic ? "رجوع" : "Back"}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.heading}>
            {arabic ? "صورتي" : "Body avatar"}
          </Text>
          <View style={styles.headerBalance} />
        </View>

        <View style={styles.privacyPanel}>
          <View style={styles.privateBadge}>
            <Text style={styles.privateBadgeText}>{arabic ? "صورة مصدر خاصة" : "PRIVATE SOURCE PHOTO"}</Text>
          </View>
          <Text style={styles.privacyTitle}>{arabic ? "صورة بتعكس تقدمك الحقيقي." : "A portrait shaped by your real progress."}</Text>
          <Text style={styles.privacyCopy}>
            {arabic
              ? "بنيان بيستخدم صورتك للحفاظ على ملامحك، وآخر قياسات مؤكدة لشكل الجسم. راجع كل نسخة قبل اعتمادها، والمشاركة في المجتمع بتفضل مقفولة."
              : "BONYAN uses your photo for identity and your latest confirmed measurements for body proportions. Review every new version before approval. Community sharing stays off."}
          </Text>
          <PrivacyTimeline arabic={arabic} />
        </View>

        {!activeAvatar && avatarsQuery.isPending ? (
          <View accessibilityLabel={arabic ? "تحميل الصور المحفوظة" : "Loading saved body avatars"} style={styles.queryStatePanel}>
            <ActivityIndicator color={colors.bronze} size="large" />
            <Text style={styles.queryStateTitle}>{arabic ? "بنراجع صورك الخاصة" : "Checking your private avatars"}</Text>
            <Text style={styles.queryStateCopy}>
              {arabic ? "بنحمّل النسخ المحفوظة وإعدادات المشاركة." : "Your saved review and community settings are loading."}
            </Text>
          </View>
        ) : !activeAvatar && avatarsQuery.isError && !avatarsQuery.data ? (
          <View accessibilityRole="alert" style={styles.queryStatePanel}>
            <Text style={styles.queryStateTitle}>{arabic ? "ما قدرناش نحمّل صورك" : "Your body avatars could not load"}</Text>
            <Text style={styles.queryStateCopy}>
              {arabic ? "إعدادات الخصوصية ما اتغيرتش. اتأكد من الاتصال قبل إنشاء نسخة جديدة." : "No privacy state changed. Reconnect before generating another version."}
            </Text>
            <AvatarButton onPress={() => void avatarsQuery.refetch()} tone="secondary">
              {arabic ? "جرّب تاني" : "Try again"}
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
            {createNewVersion ? <AvatarButton onPress={() => setCreateNewVersion(false)} tone="secondary">{arabic ? "الرجوع للصورة المحفوظة" : "Back to saved portrait"}</AvatarButton> : null}
            <View style={styles.selectorSection}>
              <Text style={styles.selectorEyebrow}>{arabic ? "شكل الصورة" : "PORTRAIT PRESENTATION"}</Text>
              <Text style={styles.selectorTitle}>{arabic ? "تحب الصورة تتقدم بشكل إيه؟" : "How should your portrait be presented?"}</Text>
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
                        {option === "men" ? (arabic ? "رجالي" : "Men") : (arabic ? "نسائي" : "Women")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.selectorHelp}>
                {arabic ? "ده بيوجه شكل الصورة، وصورتك الأصلية هي المرجع لملامحك." : "This guides the image style. Your photo remains the source of your identity."}
              </Text>
            </View>
            <MeasurementPanel arabic={arabic} query={measurementQuery} />
            <View style={styles.sourcePhotoSection}>
              <Text style={styles.selectorEyebrow}>{arabic ? "صورة المصدر الخاصة" : "PRIVATE SOURCE PHOTO"}</Text>
              <Text style={styles.sourcePhotoTitle}>
                {sourcePhoto ? (arabic ? "الصورة جاهزة للإنشاء الخاص" : "Photo ready for private generation") : (arabic ? "ضيف صورة واضحة ليك" : "Add a clear photo of you")}
              </Text>
              <Text style={styles.sourcePhotoHelp}>
                {arabic ? "اختار صورة كاملة للجسم، واضحة وفي إضاءة كويسة، ووشك ظاهر فيها. صورة الوش بس ممكن تحفظ ملامحك، لكنها مش هتعكس شكل جسمك الحالي بدقة." : "Choose a clear, well-lit, clothed full-body photo with your face visible. A face-only photo can preserve identity but cannot show your current body shape reliably."}
              </Text>
              {sourcePhoto ? (
                <Image
                  accessibilityLabel="Selected private avatar source photo"
                  resizeMode="cover"
                  source={{ uri: sourcePhoto.uri }}
                  style={styles.sourcePhotoPreview}
                />
              ) : null}
              <View style={styles.sourcePhotoActions}>
                <AvatarButton onPress={() => void chooseSourcePhoto(false)} tone="secondary">
                  {sourcePhoto ? (arabic ? "اختار صورة تانية" : "Choose Another Photo") : (arabic ? "اختار من الصور" : "Choose from Photos")}
                </AvatarButton>
                <AvatarButton onPress={() => void chooseSourcePhoto(true)} tone="secondary">
                  {arabic ? "صوّر دلوقتي" : "Take Photo"}
                </AvatarButton>
              </View>
            </View>
            <View style={styles.explainer}>
              <Text style={styles.explainerTitle}>{arabic ? "قارن النتيجة بصورتك" : "Check the result against your photo"}</Text>
              <Text style={styles.explainerCopy}>
                {arabic ? "توليد الصور ممكن يغيّر تفاصيل في الوش أو نسب الجسم. ارفض أي نسخة مش شبهك؛ والنتيجة مش فحص طبي للجسم." : "Image generation can miss facial details or body proportions. Reject a version that does not look like you; the numbers are never a medical body scan."}
              </Text>
            </View>
            <AvatarButton
              disabled={!measurementQuery.data?.available || !sourcePhoto || pending}
              loading={mutations.createMutation.isPending || mutations.sourcePhotoMutation.isPending}
              onPress={generate}
            >
              {arabic ? "أنشئ صورتي الخاصة" : "Create my private portrait"}
            </AvatarButton>
          </View>
        )}

        {mutationError ? (
          <View accessibilityRole="alert" style={styles.errorPanel}>
            <Text style={styles.errorTitle}>{arabic ? "في حاجة محتاجة مراجعة" : "Something needs attention"}</Text>
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
      <View accessibilityLabel={arabic ? "مراجعة بيانات الجسم" : "Checking body data"} style={styles.measurementPanel}>
        <ActivityIndicator color={colors.bronze} />
        <View style={styles.measurementCopy}>
          <Text style={styles.measurementTitle}>{arabic ? "بنراجع قياساتك المؤكدة" : "Checking confirmed body data"}</Text>
          <Text style={styles.measurementDetail}>{arabic ? "بندور على أحدث نتيجة InBody." : "Looking for your latest InBody result."}</Text>
        </View>
      </View>
    );
  }
  if (query.isError) {
    return (
      <View accessibilityRole="alert" style={styles.measurementPanel}>
        <View style={styles.measurementCopy}>
          <Text style={styles.measurementTitle}>{arabic ? "ما قدرناش نحمّل بيانات الجسم" : "Body data could not load"}</Text>
          <Text style={styles.measurementDetail}>{arabic ? "ما اتعملتش أي صورة. اتأكد من الاتصال وجرّب تاني." : "Nothing was generated. Reconnect and retry."}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
          <Text style={styles.retryLabel}>{arabic ? "إعادة المحاولة" : "Retry"}</Text>
        </Pressable>
      </View>
    );
  }
  if (!query.data?.available) {
    return (
      <View style={styles.measurementSourceSection}>
        <View style={styles.measurementPanel}>
          <View style={styles.measurementCopy}>
            <Text style={styles.measurementTitle}>{arabic ? "اختار مصدر القياسات" : "Choose your measurement source"}</Text>
            <Text style={styles.measurementDetail}>
              {arabic ? "ارفع تقرير InBody أو اكتب قياسات مؤكدة تحت." : "Complete an InBody scan, or enter confirmed measurements below."}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
            <Text style={styles.retryLabel}>{arabic ? "راجع InBody" : "Check InBody"}</Text>
          </Pressable>
        </View>
        <ManualMeasurementsForm arabic={arabic} onSaved={() => void query.refetch()} />
      </View>
    );
  }

  const fields = [
    arabic ? "الطول" : "Height",
    arabic ? "الوزن" : "Weight",
    query.data.body_fat_available ? arabic ? "دهون الجسم" : "Body fat" : null,
    query.data.muscle_mass_available ? arabic ? "الكتلة العضلية" : "Muscle mass" : null,
  ].filter((field): field is string => field !== null);
  return (
    <View style={styles.measurementSourceSection}>
      <View style={styles.measurementReadyPanel}>
        <View style={styles.measurementReadyHeader}>
          <View style={styles.readyDot} />
          <Text style={styles.readyLabel}>
            {query.data.source === "inbody" ? (arabic ? "أحدث INBODY جاهز" : "LATEST INBODY READY") : (arabic ? "القياسات اليدوية جاهزة" : "MANUAL DATA READY")}
          </Text>
        </View>
        <Text style={styles.measurementReadyTitle}>{arabic ? "البيانات كفاية لتجهيز صورتك" : "Enough data to shape your avatar"}</Text>
        <View style={styles.shapeRow}>
          <Text style={styles.shapeLabel}>{arabic ? "الشكل التقديري" : "CALCULATED SHAPE"}</Text>
          <Text style={styles.shapeValue}>
            {query.data.shape_profile ? shapeLabel(query.data.shape_profile, arabic) : arabic ? "هيظهر بعد الإنشاء" : "Ready after build"}
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
          <Text style={styles.recordedAt}>{arabic ? `مسجلة ${formatDate(query.data.recorded_at, true)}` : `Recorded ${formatDate(query.data.recorded_at, false)}`}</Text>
        ) : null}
        <Text style={styles.sourceRule}>{arabic ? "بنستخدم أحدث مصدر قياسات مؤكد." : "The most recently confirmed source is used."}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setShowManualForm((current) => !current)}
        style={styles.manualAction}
      >
        <Text style={styles.manualActionText}>
          {showManualForm
            ? arabic ? "خلي المصدر الحالي" : "Keep current source"
            : query.data.source === "profile"
              ? arabic ? "حدّث القياسات اليدوية" : "Update manual measurements"
              : arabic ? "استخدم قياسات يدوية بدلًا منها" : "Use manual measurements instead"}
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
  const renewal = avatarRenewalStatus(avatar.measurements_recorded_at, latestMeasurementsAt);
  return (
    <View style={styles.previewSection}>
      {avatar.preview_url ? (
        <View style={styles.portraitReview}>
          <Image
            accessibilityLabel={arabic ? "الصورة الخاصة المتولدة للمراجعة" : "Generated private avatar portrait for review"}
            resizeMode="contain"
            source={{ uri: avatar.preview_url }}
            style={styles.generatedPortrait}
          />
          <Text style={styles.portraitStatus}>
            {avatar.public_in_community ? (arabic ? "المشاركة في المجتمع مفعّلة" : "COMMUNITY ENABLED") : (arabic ? "خاصة لحد ما تعتمدها وتفعّل المشاركة" : "PRIVATE UNTIL YOU APPROVE AND ENABLE SHARING")}
          </Text>
          {sourcePhoto ? <View style={styles.identityComparison}>
            <Image
              accessibilityLabel={arabic ? "صورتك الخاصة لمقارنة الملامح" : "Your private source photo for identity comparison"}
              resizeMode="cover"
              source={{ uri: sourcePhoto.uri }}
              style={styles.identityReference}
            />
            <View style={styles.identityComparisonCopy}>
              <Text style={styles.identityComparisonTitle}>{arabic ? "الصورة شبهك؟" : "Does this look like you?"}</Text>
              <Text style={styles.identityComparisonDetail}>{arabic ? "قارن ملامح الوش ولون البشرة ونسب الجسم بصورتك. ارفض أي اختلاف واضح." : "Compare facial features, skin tone and body proportions with your photo. Reject mismatches."}</Text>
            </View>
          </View> : null}
        </View>
      ) : (
        <View accessibilityLabel={arabic ? "حالة إنشاء الصورة" : "Body avatar generation status"} style={styles.statusPanel}>
          {avatar.state === "processing" ? (
            <ActivityIndicator color={colors.bronze} size="large" />
          ) : null}
          <Text style={styles.statusLabel}>
            {avatar.state === "failed" ? (arabic ? "الإنشاء متوقف" : "GENERATION PAUSED") : (arabic ? "بنجهز صورتك" : "CREATING YOUR PORTRAIT")}
          </Text>
        </View>
      )}
      <View style={styles.sourceLine}>
        <Text style={styles.sourceLabel}>{arabic ? "صورة + قياسات" : "PHOTO + MEASUREMENTS"}</Text>
        <View style={styles.sourceDot} />
        <Text style={styles.sourceLabel}>
          {avatar.measurement_source === "inbody" ? "INBODY" : arabic ? "الملف الشخصي" : "PROFILE"}
        </Text>
        <Text style={styles.sourceDate}>{formatDate(avatar.measurements_recorded_at, arabic)}</Text>
      </View>
      <View style={styles.shapeSummary}>
        <Text style={styles.shapeSummaryLabel}>{arabic ? "الشكل" : "SHAPE"}</Text>
        <Text style={styles.shapeSummaryValue}>{shapeLabel(avatar.shape_profile, arabic)}</Text>
        <Text style={styles.shapeSummaryMeta}>{arabic ? `عرض ${avatar.presentation === "men" ? "رجالي" : "نسائي"}` : `${titleCase(avatar.presentation)} presentation`}</Text>
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
            {arabic ? "اعتمد الصورة دي" : "Approve this portrait"}
          </AvatarButton>
          <View style={styles.actionRow}>
            <View style={styles.actionHalf}>
              <AvatarButton
                disabled={pending && !mutations.regenerateMutation.isPending}
                loading={mutations.regenerateMutation.isPending}
                onPress={() => updateAvatar(mutations.regenerateMutation)}
                tone="secondary"
              >
                {arabic ? "جرّب نسخة تانية" : "Try another version"}
              </AvatarButton>
            </View>
            <View style={styles.actionHalf}>
              <AvatarButton
                disabled={pending && !mutations.rejectMutation.isPending}
                loading={mutations.rejectMutation.isPending}
                onPress={() => updateAvatar(mutations.rejectMutation)}
                tone="secondary"
              >
                {arabic ? "رفض" : "Reject"}
              </AvatarButton>
            </View>
          </View>
        </View>
      ) : null}

      {avatar.approved ? (
        <View style={styles.renewalPanel}>
          <Text style={styles.communityTitle}>{renewal === "new_measurements" ? (arabic ? "قياسات جسمك اتغيرت" : "Your body data has changed") : renewal === "reassessment_due" ? (arabic ? "وقت تحديث قياساتك" : "Time to check in on your measurements") : (arabic ? "خلي صورتك محدثة" : "Keep this portrait current")}</Text>
          <Text style={styles.communityDetail}>{renewal === "new_measurements" ? (arabic ? "اعمل نسخة خاصة جديدة بأحدث قياسات مؤكدة. الصورة المعتمدة هتفضل موجودة لحد ما تراجع الجديدة." : "Create a new private version from your latest confirmed measurements. This approved image stays available until you review the new one.") : renewal === "reassessment_due" ? (arabic ? "عدّى حوالي شهرين من آخر تقييم للجسم. حدّث قياساتك قبل ما تعمل صورة جديدة." : "It has been about two months since your last body assessment. Update it before creating your next portrait.") : (arabic ? "لما شكل جسمك يتغير، أكد قياسات جديدة واعمل نسخة خاصة للمراجعة." : "When your shape changes, confirm new measurements and make another private version for review.")}</Text>
          {renewal === "new_measurements" ? <AvatarButton disabled={pending} onPress={() => updateAvatar(mutations.regenerateMutation)} tone="secondary">{arabic ? "حدّث بأحدث القياسات" : "Refresh from latest measurements"}</AvatarButton> : null}
          {renewal === "reassessment_due" ? <AvatarButton onPress={onUpdateMeasurements} tone="secondary">{arabic ? "حدّث قياسات الجسم" : "Update body measurements"}</AvatarButton> : null}
        </View>
      ) : null}

      {avatar.approved ? (
        <View style={styles.communityControl}>
          <View style={styles.communityCopy}>
            <Text style={styles.communityTitle}>{arabic ? "استخدمها في المجتمع" : "Use in community"}</Text>
            <Text style={styles.communityDetail}>
              {arabic ? "اظهر الصورة المعتمدة جنب المنشورات اللي تختارها. قياساتك تفضل خاصة." : "Show this approved portrait beside chosen posts. Measurements stay private."}
            </Text>
          </View>
          <Switch
            accessibilityLabel={arabic ? "استخدام الصورة المعتمدة في المجتمع" : "Use approved body avatar in community"}
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

      {onDeleteSourcePhoto ? (
        <View style={styles.sourcePrivacyControl}>
          <Text style={styles.communityTitle}>{arabic ? "صورة المصدر الخاصة محفوظة" : "Private source photo retained"}</Text>
          <Text style={styles.communityDetail}>
            {arabic ? "احتفظ بيها لعمل نسخ تانية، أو احذفها دلوقتي. الصورة المتولدة هتفضل موجودة." : "Keep it for regeneration, or delete it now. Your generated avatar remains available."}
          </Text>
          <AvatarButton
            disabled={pending && !mutations.deleteSourcePhotoMutation.isPending}
            loading={mutations.deleteSourcePhotoMutation.isPending}
            onPress={onDeleteSourcePhoto}
            tone="secondary"
          >
            {arabic ? "احذف صورة المصدر الخاصة" : "Delete Private Source Photo"}
          </AvatarButton>
        </View>
      ) : null}

      <AvatarButton disabled={pending} onPress={onCreateNew} tone="secondary">
        {arabic ? "أنشئ صورة جديدة بصورة مختلفة" : "Create a new portrait with another photo"}
      </AvatarButton>

      {(avatar.state === "failed" && avatar.failure_code !== "source_image_required") ||
      avatar.state === "rejected" ? (
        <AvatarButton
          disabled={pending && !mutations.regenerateMutation.isPending}
          loading={mutations.regenerateMutation.isPending}
          onPress={() => updateAvatar(mutations.regenerateMutation)}
        >
          {arabic ? "أنشئ بأحدث البيانات" : "Build from latest data"}
        </AvatarButton>
      ) : null}

      <AvatarButton disabled={pending} onPress={confirmDelete} tone="danger">
        {avatar.failure_code === "source_image_required"
          ? arabic ? "احذف النسخة وأضف صورة" : "Delete Failed Version and Add Photo"
          : arabic ? "احذف الصورة" : "Delete body avatar"}
      </AvatarButton>
    </View>
  );
}

function avatarStateTitle(avatar: AvatarView, arabic: boolean): string {
  if (avatar.state === "approved") return arabic ? "إنت اعتمدت الصورة دي" : "Approved by you";
  if (avatar.state === "rejected") return arabic ? "النسخة دي مرفوضة" : "This version is rejected";
  if (avatar.state === "failed") return arabic ? "الصورة ما اكتملتش" : "The portrait did not finish";
  if (avatar.state === "processing" || avatar.state === "requested") {
    return arabic ? "بنجهز صورتك الخاصة" : "Creating your private portrait";
  }
  return arabic ? "راجع صورتك الجديدة" : "Review your new portrait";
}

function avatarStateCopy(avatar: AvatarView, arabic: boolean): string {
  if (avatar.state === "approved") {
    return arabic ? "محفوظة بشكل خاص. مش هتظهر في المجتمع إلا لو فعّلت الاختيار تحت." : "Saved privately. It appears in the community only if you enable the control below.";
  }
  if (avatar.state === "rejected") {
    return arabic ? "ما اتنشرش أي شيء. اعمل نسخة تانية من أحدث بيانات مؤكدة." : "Nothing was published. Build another version from your latest confirmed data.";
  }
  if (avatar.state === "failed") {
    if (avatar.failure_code === "source_image_required") {
      return arabic ? "النسخة دي اتطلبت من غير صورة المصدر الخاصة. احذفها، واختار صورة واضحة، وابدأ تاني." : "This version was created without the private photo required by the Avatar provider. Delete it, then choose a source photo and build again.";
    }
    return arabic ? "ما اتنشرش أي شيء. قياساتك لسه محفوظة وتقدر تجرب تاني." : "Nothing was published. Your measurements remain available for a safe retry.";
  }
  if (avatar.state === "processing" || avatar.state === "requested") {
    return arabic ? "بنستخدم صورتك وقياساتك المؤكدة علشان نجهز صورة خاصة ليك." : "Your photo and confirmed measurements are being used to create a private portrait.";
  }
  return arabic ? "قارن ملامحك ونسب جسمك بصورة المصدر. ارفض أي نتيجة مش دقيقة." : "Check identity and body proportions against your source photo. Reject anything that does not feel accurate.";
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
