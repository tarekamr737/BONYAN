import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { getMyProfile } from "../../auth/api/profileApi";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CinematicHero } from "../../../core/components/CinematicHero";
import { ApiError } from "../../../core/api/errors";
import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { MotionReveal } from "../../../core/components/MotionReveal";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { generateWorkoutPlan, getCurrentWorkoutPlan, getWorkoutSessions, startWorkoutSession } from "../api/trainingApi";
import { ExerciseCard } from "../components/ExerciseCard";

function formatLabel(value: string): string { return value.replaceAll("_", " "); }
const arabicLabels: Record<string, string> = {
  strength: "قوة",
  hypertrophy: "بناء عضلات",
  fat_loss: "خسارة دهون",
  general_fitness: "لياقة عامة",
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};
function planLabel(value: string, arabic: boolean): string { return arabic ? (arabicLabels[value.toLowerCase()] ?? formatLabel(value)) : formatLabel(value); }
function weeklyDays(value: number, arabic: boolean): string { if (!arabic) return `${value} days/wk`; return value === 1 ? "يوم واحد أسبوعيًا" : value === 2 ? "يومين أسبوعيًا" : `${value} أيام أسبوعيًا`; }
function dayName(value: string, arabic: boolean): string { return arabic && value.toLowerCase() === "custom workout" ? "تمرين مخصص" : value; }
export function TrainingHomeScreen() {
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
  const days = plan?.days.slice().sort((a, b) => a.order - b.order) ?? [];
  const selectedDay = days.find(day => day.key === selectedDayKey) ?? days[0];
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;
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
        <CinematicHero arabic={arabic} source={require("../../../../assets/heroes/training.jpg")} title={arabic ? "نظام تمرينك" : "Your training plan"} subtitle={arabic ? "انضباط اليوم. نتائج بكرة." : "Discipline today. Results tomorrow."} />
        {hasLimitations ? <SurfaceCard>
          <Text style={styles.stateTitle}>{arabic ? "التدريب متوقف مؤقتًا" : "Training paused"}</Text>
          <Text style={styles.stateCopy}>{arabic ? "ملفك يتضمن إصابة أو قيدًا حركيًا. راجع مختصًا مؤهلًا قبل التدريب، ثم حدّث ملفك عندما تصبح مستعدًا." : "Your profile lists an injury or movement limitation. Check with a qualified professional before training, then update your profile when cleared."}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/profile")} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>{arabic ? "تعديل ملفي" : "Review my profile"}</Text></Pressable>
        </SurfaceCard> : null}


        {planJustPrepared && plan ? <MotionReveal><SurfaceCard><View style={[styles.feedbackRow, arabic && styles.rowReverse]}><View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View><View style={styles.feedbackCopy}><Text style={styles.feedbackTitle}>{arabic ? "الخطة جاهزة" : "Your plan is ready"}</Text><Text style={styles.stateCopy}>{arabic ? "اختر يوم التمرين الذي تريد البدء به." : "Choose a workout day to get started."}</Text></View></View></SurfaceCard></MotionReveal> : null}

        {planQuery.isPending ? (
          <SurfaceCard>
            <ActivityIndicator color={colors.bronze} />
            <Text style={styles.stateTitle}>{arabic ? "بنراجع خطة تمرينك" : "Checking your plan"}</Text>
            <Text style={styles.stateCopy}>{arabic ? "لحظات ونجيب آخر نظام نشط على حسابك." : "We are loading the latest active training cycle for your account."}</Text>
          </SurfaceCard>
        ) : null}

        {planQuery.isError ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{arabic ? "تعذر تحميل الخطة" : "Plan unavailable"}</Text>
            <Text style={styles.stateCopy}>
              {arabic ? "بياناتك محفوظة. حاول مرة أخرى عند استقرار الاتصال." : "Your data is safe. Retry when the connection is back."}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => planQuery.refetch()} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>{arabic ? "إعادة المحاولة" : "Retry"}</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {!planQuery.isPending && !planQuery.isError && !plan ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{arabic ? "كيف تحب تبدأ تمرينك؟" : "How would you like to start?"}</Text>
            <Text style={styles.stateCopy}>
              {arabic ? "اختر خطة ذكية من بيانات ملفك أو ابنِ تمرينًا سريعًا بنفسك." : "Use your saved profile for an AI plan, or build a focused workout yourself."}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={hasLimitations || generateMutation.isPending || !profile.data}
              onPress={() => {if (generating.current) return; generating.current = true; void generateMutation.mutateAsync().catch(() => {}).finally(() => {generating.current = false;}); }}
              style={[styles.primaryAction, (hasLimitations || generateMutation.isPending) && styles.disabledAction]}
            >
              <Text style={styles.primaryActionText}>
                {generateMutation.isPending ? arabic ? "جارٍ تجهيز الخطة…" : "Preparing your plan…" : arabic ? "توليد التمرين بالذكاء الاصطناعي" : "Generate my workout with AI"}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={hasLimitations} onPress={() => router.push("/training/manual")} style={[styles.secondaryAction, {marginTop: spacing.sm}, hasLimitations && styles.disabledAction]}>
              <Text style={styles.secondaryActionText}>{arabic ? "اختيار التمرين يدويًا" : "Choose my workout manually"}</Text>
            </Pressable>
            {generateMutation.isError ? <Text style={styles.errorText}>{arabic ? "لم نتمكن من تجهيز الخطة الآن. حاول مرة أخرى." : "We could not prepare the plan. Try again."}</Text> : null}
          </SurfaceCard>
        ) : null}

        {plan && selectedDay ? (
          <>
            <SurfaceCard>
              <View style={styles.dayPicker}>
                <Text style={styles.label}>{arabic ? "اختر يوم التمرين" : "CHOOSE A WORKOUT DAY"}</Text>
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
                        <Text style={[styles.dayOptionNumber, selected && styles.dayOptionTextSelected]}>{arabic ? `اليوم ${index + 1}` : `DAY ${index + 1}`}</Text>
                        <Text numberOfLines={1} style={[styles.dayOptionName, selected && styles.dayOptionTextSelected]}>{dayName(day.name, arabic)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={styles.planHeader}>
                <View style={styles.titleWrap}>
                  <Text style={styles.label}>{arabic ? "الخطة الحالية" : "CURRENT PLAN"}</Text>
                  <Text style={styles.planTitle}>{dayName(selectedDay.name, arabic)}</Text>
                </View>
                <View style={styles.durationPill}>
                  <Text style={styles.durationText}>{selectedDay.estimated_minutes} {arabic ? "دقيقة" : "min"}</Text>
                </View>
              </View>
              <View style={styles.planStats}>
                <Text style={styles.stat}>{weeklyDays(plan.days_per_week, arabic)}</Text>
                <Text style={styles.stat}>{planLabel(plan.goal, arabic)}</Text>
                <Text style={styles.stat}>{planLabel(plan.experience, arabic)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={hasLimitations || startMutation.isPending}
                onPress={() => startMutation.mutate()}
                style={[styles.primaryAction, (hasLimitations || startMutation.isPending) && styles.disabledAction]}
              >
                <Text style={styles.primaryActionText}>
                  {startMutation.isPending ? arabic ? "بنبدأ…" : "Starting…" : arabic ? "ابدأ التمرين" : "Start workout"}
                </Text>
              </Pressable>
              {startMutation.isError ? <Text accessibilityRole="alert" style={styles.errorText}>{startMutation.error instanceof ApiError
                ? (arabic ? `تعذر بدء التمرين (${startMutation.error.code}). حاول مرة أخرى.` : startMutation.error.message)
                : (arabic ? "تعذر بدء التمرين. حاول مرة أخرى." : "Workout could not be started. Try again.")}</Text> : null}
            </SurfaceCard>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{arabic ? "تمارين اليوم المختار" : "Selected day exercises"}</Text>
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
          <Text style={styles.stateTitle}>{arabic ? "تحليل التدريب" : "Training analysis"}</Text>
          {sessions.isPending ? <ActivityIndicator color={colors.bronze} /> : null}
          {sessions.isError ? <><Text style={styles.stateCopy}>{arabic ? "تعذّر تحميل سجل التمرين." : "Your workout history could not be loaded."}</Text><Pressable accessibilityRole="button" onPress={() => sessions.refetch()} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>{arabic ? "إعادة المحاولة" : "Retry"}</Text></Pressable></> : null}
          {sessions.data?.length === 0 ? <Text style={styles.stateCopy}>{arabic ? "أكمل أول تمرين لتظهر هنا تحليلات التقدم والسجل." : "Complete your first workout to unlock progress insights and history."}</Text> : null}
          {completedSessions.length > 0 ? <><View style={styles.planStats}><Text style={styles.stat}>{arabic ? `${completedSessions.length} تمرين مكتمل` : `${completedSessions.length} completed`}</Text><Text style={styles.stat}>{arabic ? `${Math.round(totalVolume)} كجم حجم تدريبي` : `${Math.round(totalVolume)} kg volume`}</Text></View>{completedSessions.slice(0, 5).map(session => <Pressable accessibilityRole="button" key={session.id} onPress={() => router.push({pathname: "/training/day", params: {dayKey: session.day_key, sessionId: session.id}})} style={styles.historyRow}><View style={styles.titleWrap}><Text style={styles.historyTitle}>{session.day_key.replaceAll("-", " ")}</Text><Text style={styles.stateCopy}>{new Intl.DateTimeFormat(arabic ? "ar-EG" : "en", {day: "numeric", month: "short", year: "numeric"}).format(new Date(session.completed_at ?? session.started_at))}</Text></View><Text style={styles.historyMeta}>{Number(session.summary.sets ?? session.logged_sets.length)} {arabic ? "مجموعات" : "sets"}</Text></Pressable>)}</> : null}
        </SurfaceCard>

        <View style={styles.actions}>
          {profile.data?.training_goal === "military_preparation" ? <Pressable accessibilityRole="button" onPress={() => router.push("/profile")} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>{arabic ? "تحديث مستوى البداية" : "Update baseline"}</Text></Pressable> : null}
          <Pressable
            accessibilityRole="button"
            disabled={hasLimitations}
            onPress={() => router.push("/training/manual")}
            style={[styles.secondaryAction, hasLimitations && styles.disabledAction]}
          >
            <Text style={styles.secondaryActionText}>{arabic ? "تمرين يدوي" : "Build manually"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/training/coach")}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionText}>{arabic ? "تحدث مع الكوتش" : "Ask coach"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={hasLimitations || generateMutation.isPending || !profile.data}
            onPress={() => {if (generating.current) return; generating.current = true; void generateMutation.mutateAsync().catch(() => {}).finally(() => {generating.current = false;}); }}
            style={[styles.secondaryAction, hasLimitations && styles.disabledAction]}
          >
            <Text style={styles.secondaryActionText}>
              {generateMutation.isPending ? arabic ? "جارٍ التجهيز…" : "Preparing…" : plan ? arabic ? "تجهيز خطة جديدة" : "Replace plan" : arabic ? "تجهيز الخطة" : "Prepare plan"}
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
