import {useLocale} from "../../../core/i18n/LocaleProvider";
import {getExerciseCatalog, generateWorkoutPlan, getCurrentWorkoutPlan, getWorkoutSessions, startWorkoutSession } from "../api/trainingApi";
import {planLabel, weeklyDays, workoutDayLabel as dayName} from "../../../core/i18n/fitness";
import { phrase, phraseTemplate } from "../../../core/i18n/copy";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { getMyProfile } from "../../auth/api/profileApi";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FeatureHeader } from "../../../core/components/FeatureHeader";
import { AppButton } from "../../../core/components/AppButton";
import { ApiError } from "../../../core/api/errors";
import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { MotionReveal } from "../../../core/components/MotionReveal";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { ExerciseCard } from "../components/ExerciseCard";
import { planGenerationError, planNeedsRefresh, planRefreshMessage } from "../planIntegrity";

export function TrainingHomeScreen() {
  const {t} = useLocale();
  const catalog = useQuery({queryKey: ["training", "catalog"], queryFn: getExerciseCatalog, staleTime: 300_000});
  const generating = useRef(false);
  const [planJustPrepared, setPlanJustPrepared] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string>();
  const profile = useQuery({queryKey: ["profile", "me"], queryFn: getMyProfile});
  const planQuery = useQuery({
    queryFn: getCurrentWorkoutPlan,
    queryKey: ["training", "current-plan"],
  });
  const sessions = useQuery({
    queryFn: () => getWorkoutSessions(20),
    queryKey: ["training", "sessions"],
  });
  const plan = planQuery.data;
  const needsRefresh = planNeedsRefresh(plan);
  const days = plan?.days.slice().sort((a, b) => a.order - b.order) ?? [];
  const selectedDay = days.find(day => day.key === selectedDayKey) ?? days[0];
  const {rtl: arabic} = useLocale();
  const hasLimitations = Boolean(profile.data?.coaching?.limitations?.trim());
  const completedSessions = sessions.data?.filter(item => item.status === "completed") ?? [];
  const totalVolume = completedSessions.reduce((sum, item) => sum + Number(item.summary.volume_kg ?? 0), 0);

  const generateMutation = useMutation({
    onMutate: () => setPlanJustPrepared(false),
    mutationFn: () => {
      if (!profile.data) throw new Error("Your profile is still loading.");
      const p = profile.data;
      return generateWorkoutPlan({goal: p.training_goal ?? "general_fitness", experience: p.experience_level ?? "beginner", days_per_week: p.available_training_days ?? 3, session_duration_minutes: 45, equipment: p.available_equipment, activate: false});
    },
    onSuccess: (createdPlan) => {
      router.push({pathname: "/training/review", params: {planId: createdPlan.id}});
      setPlanJustPrepared(true);
      if (Platform.OS === "ios") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!plan?.id || !selectedDay?.key) {
        throw new Error("No workout day is ready to start.");
      }
      return startWorkoutSession(plan.id, selectedDay.key);
    },
    onSuccess: (session) => {
      router.push({
        pathname: "/training/day",
        params: {
          dayKey: session.day_key,
          sessionId: session.id,
        },
      });
    },
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FeatureHeader title={t("train")} subtitle={phrase("copy_e5a5ec3cd07f", arabic)}/>
        <AppButton variant="secondary" disabled={hasLimitations || catalog.data?.available === false} label={phrase("copy_edf0639cbc1f", arabic)} onPress={() => router.push("/training/manual")}/>
        {hasLimitations ? <SurfaceCard>
          <Text style={styles.stateTitle}>{phrase("copy_ea2ea06dab85", arabic)}</Text>
          <Text style={styles.stateCopy}>{phrase("copy_37df55acee57", arabic)}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/profile")} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>{phrase("copy_e02bb8f5017c", arabic)}</Text></Pressable>
        </SurfaceCard> : null}


        {planJustPrepared && generateMutation.data?.id === plan?.id ? <MotionReveal><SurfaceCard><View style={[styles.feedbackRow, arabic && styles.rowReverse]}><View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View><View style={styles.feedbackCopy}><Text style={styles.feedbackTitle}>{phrase("copy_be9206d9bed4", arabic)}</Text><Text style={styles.stateCopy}>{phrase("copy_9d503aae25a4", arabic)}</Text></View></View></SurfaceCard></MotionReveal> : null}

        {needsRefresh ? <SurfaceCard>
          <Text accessibilityRole="alert" style={styles.stateCopy}>{planRefreshMessage(arabic)}</Text>
          <Pressable accessibilityRole="button" disabled={catalog.data?.available === false || hasLimitations || generateMutation.isPending || !profile.data} style={styles.primaryAction} onPress={() => { if (generating.current) return; generating.current = true; void generateMutation.mutateAsync().catch(() => {}).finally(() => { generating.current = false; }); }}>
            <Text style={styles.primaryActionText}>{generateMutation.isPending ? (phrase("copy_31ef84bf1419", arabic)) : (phrase("copy_4102dae6574d", arabic))}</Text>
          </Pressable>
        </SurfaceCard> : null}

        {catalog.data?.available === false ? <SurfaceCard><Text style={styles.stateCopy}>{t("catalogLicenseRequired")}</Text></SurfaceCard> : null}
        {generateMutation.isError ? <SurfaceCard><Text accessibilityRole="alert" style={styles.errorText}>{planGenerationError(generateMutation.error instanceof ApiError ? generateMutation.error.code : undefined, arabic)}</Text></SurfaceCard> : null}

        {planQuery.isPending ? (
          <SurfaceCard>
            <ActivityIndicator color={colors.bronze} />
            <Text style={styles.stateTitle}>{phrase("copy_f6cc9a28b593", arabic)}</Text>
            <Text style={styles.stateCopy}>{phrase("copy_01f190a2cb47", arabic)}</Text>
          </SurfaceCard>
        ) : null}

        {planQuery.isError ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{phrase("copy_2bbd1d1c3de0", arabic)}</Text>
            <Text style={styles.stateCopy}>
              {phrase("copy_633c343c52f3", arabic)}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => planQuery.refetch()} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>{phrase("copy_bb30cda7c34e", arabic)}</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {!planQuery.isPending && !planQuery.isError && !plan ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{phrase("copy_b80dba744499", arabic)}</Text>
            <Text style={styles.stateCopy}>
              {phrase("copy_97208e899a38", arabic)}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={catalog.data?.available === false || hasLimitations || generateMutation.isPending || !profile.data}
              onPress={() => {if (generating.current) return; generating.current = true; void generateMutation.mutateAsync().catch(() => {}).finally(() => {generating.current = false;}); }}
              style={[styles.primaryAction, (hasLimitations || generateMutation.isPending) && styles.disabledAction]}
            >
              <Text style={styles.primaryActionText}>
                {generateMutation.isPending ? phrase("copy_5a581cc7bbe4", arabic) : phrase("copy_abb3d0e816ba", arabic)}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={hasLimitations} onPress={() => router.push("/training/manual")} style={[styles.secondaryAction, {marginTop: spacing.sm}, hasLimitations && styles.disabledAction]}>
              <Text style={styles.secondaryActionText}>{phrase("copy_4a919149f16e", arabic)}</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {plan && selectedDay ? (
          <>
            <SurfaceCard>
              <View style={styles.dayPicker}>
                <Text style={styles.label}>{phrase("copy_4b0059b2849c", arabic)}</Text>
                <View style={[styles.dayOptions, arabic && styles.rowReverse]}>
                  {days.map((day, index) => {
                    const selected = day.key === selectedDay.key;
                    return (
                      <Pressable
                        key={day.key}
                        accessibilityRole="button"
                        accessibilityState={{selected, disabled: startMutation.isPending}}
                        disabled={startMutation.isPending}
                        onPress={() => { setSelectedDayKey(day.key); startMutation.reset(); }}
                        style={[styles.dayOption, selected && styles.dayOptionSelected]}
                      >
                        <Text style={[styles.dayOptionNumber, selected && styles.dayOptionTextSelected]}>{phraseTemplate("copy_d1ba4abc1a80", arabic, (arabic) ? [index + 1] : [index + 1])}</Text>
                        <Text numberOfLines={1} style={[styles.dayOptionName, selected && styles.dayOptionTextSelected]}>{dayName(day.name, arabic)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.planHeader}>
                <View style={styles.titleWrap}>
                  <Text style={styles.label}>{phrase("copy_6e8924ec2632", arabic)}</Text>
                  <Text style={styles.planTitle}>{dayName(selectedDay.name, arabic)}</Text>
                </View>
                <View style={styles.durationPill}>
                  <Text style={styles.durationText}>{selectedDay.estimated_minutes} {phrase("copy_2c0d20895fc8", arabic)}</Text>
                </View>
              </View>
              <View style={styles.planStats}>
                <Text style={styles.stat}>{weeklyDays(plan.days_per_week, arabic)}</Text>
                <Text style={styles.stat}>{planLabel(plan.goal, arabic)}</Text>
                <Text style={styles.stat}>{planLabel(plan.experience, arabic)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={hasLimitations || needsRefresh || startMutation.isPending}
                onPress={() => startMutation.mutate()}
                style={[styles.primaryAction, (hasLimitations || needsRefresh || startMutation.isPending) && styles.disabledAction]}
              >
                <Text style={styles.primaryActionText}>
                  {startMutation.isPending ? phrase("copy_28d8af7d06cb", arabic) : phrase("copy_4020e910bba7", arabic)}
                </Text>
              </Pressable>
              {startMutation.isError ? <Text accessibilityRole="alert" style={styles.errorText}>{startMutation.error instanceof ApiError
                ? (arabic ? `تعذر بدء التمرين (${startMutation.error.code}). حاول مرة أخرى.` : startMutation.error.message)
                : (phrase("copy_cab569f1735b", arabic))}</Text> : null}
            </SurfaceCard>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{phrase("copy_e1942b4c94ea", arabic)}</Text>
              {selectedDay.prescriptions.map((exercise, index) => (
                <ExerciseCard
                  arabic={arabic}
                  key={`${exercise.exercise_id}-${index}`}
                  active={index === 0}
                  exercise={exercise}
                  index={index}
                />
              ))}
            </View>
          </>
        ) : null}

        <SurfaceCard>
          <Text style={styles.stateTitle}>{phrase("copy_4043e31f9a34", arabic)}</Text>
          {sessions.isPending ? <ActivityIndicator color={colors.bronze} /> : null}
          {sessions.isError ? <><Text style={styles.stateCopy}>{phrase("copy_07f4bcd08b43", arabic)}</Text><Pressable accessibilityRole="button" onPress={() => sessions.refetch()} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>{phrase("copy_bb30cda7c34e", arabic)}</Text></Pressable></> : null}
          {sessions.data?.length === 0 ? <Text style={styles.stateCopy}>{phrase("copy_464fb63049b4", arabic)}</Text> : null}
          {completedSessions.length > 0 ? <><View style={styles.planStats}><Text style={styles.stat}>{phraseTemplate("copy_51f61d186ebf", arabic, (arabic) ? [completedSessions.length] : [completedSessions.length])}</Text><Text style={styles.stat}>{phraseTemplate("copy_52a186ee4b3a", arabic, (arabic) ? [Math.round(totalVolume)] : [Math.round(totalVolume)])}</Text></View>{completedSessions.slice(0, 5).map(session => <Pressable accessibilityRole="button" key={session.id} onPress={() => router.push({pathname: "/training/day", params: {dayKey: session.day_key, sessionId: session.id}})} style={styles.historyRow}><View style={styles.titleWrap}><Text style={styles.historyTitle}>{session.day_key.replaceAll("-", " ")}</Text><Text style={styles.stateCopy}>{new Intl.DateTimeFormat(arabic ? "ar-EG" : "en", {day: "numeric", month: "short", year: "numeric"}).format(new Date(session.completed_at ?? session.started_at))}</Text></View><Text style={styles.historyMeta}>{Number(session.summary.sets ?? session.logged_sets.length)} {phrase("copy_bb2fdf6e13c9", arabic)}</Text></Pressable>)}</> : null}
        </SurfaceCard>

        <View style={styles.actions}>
          {profile.data?.training_goal === "military_preparation" ? <Pressable accessibilityRole="button" onPress={() => router.push("/profile")} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>{phrase("copy_db4bf00709b8", arabic)}</Text></Pressable> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/training/coach")}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionText}>{phrase("copy_e4f1553b5872", arabic)}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={catalog.data?.available === false || hasLimitations || generateMutation.isPending || !profile.data}
            onPress={() => {if (generating.current) return; generating.current = true; void generateMutation.mutateAsync().catch(() => {}).finally(() => {generating.current = false;}); }}
            style={[styles.secondaryAction, hasLimitations && styles.disabledAction]}
          >
            <Text style={styles.secondaryActionText}>
              {generateMutation.isPending ? phrase("copy_31ef84bf1419", arabic) : plan ? phrase("copy_3d83416def04", arabic) : phrase("copy_5b45c7321c4d", arabic)}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dayOption: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 60,
    flexBasis: "45%",
    flexGrow: 1,
    minWidth: 112,
    paddingHorizontal: spacing.sm,
  },
  dayOptionName: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  dayOptionNumber: { color: colors.mutedLight, fontFamily: fonts.bodySemiBold, fontSize: 10 },
  dayOptionSelected: { backgroundColor: colors.bronzeSoft, borderColor: colors.bronzeBorder },
  dayOptionTextSelected: { color: colors.bronze },
  dayOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dayPicker: { gap: spacing.sm, marginBottom: spacing.lg },
  disabledAction: {
    opacity: 0.55,
  },
  feedbackCopy: { flex: 1 },
  feedbackRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  feedbackTitle: { color: colors.positive, fontFamily: fonts.displaySemiBold, fontSize: 19, lineHeight: 25 },
  historyMeta: { color: colors.bronze, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  historyRow: { alignItems: "center", borderTopColor: colors.line, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", minHeight: 58, paddingTop: spacing.sm },
  historyTitle: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14, textTransform: "capitalize" },
  rowReverse: { flexDirection: "row-reverse" },
  successIcon: { alignItems: "center", backgroundColor: "rgba(111,207,151,0.12)", borderColor: "rgba(111,207,151,0.35)", borderRadius: 18, borderWidth: 1, height: 52, justifyContent: "center", width: 52 },
  successIconText: { color: colors.positive, fontFamily: fonts.displayBold, fontSize: 22 },
  durationPill: {
    backgroundColor: colors.bronzeSoft,
    borderColor: colors.bronzeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  durationText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  label: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  planHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  planStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginVertical: spacing.lg,
  },
  planTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 24,
    lineHeight: 30,
    marginTop: spacing.xs,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 54,
  },
  primaryActionText: {
    color: colors.canvas,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: colors.bronzeBorder,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryActionText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
  stat: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    color: colors.mutedLight,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: "uppercase",
  },
  stateCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  stateTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    lineHeight: 28,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
});
