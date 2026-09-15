import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { getMyProfile } from "../../auth/api/profileApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { MotionReveal } from "../../../core/components/MotionReveal";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { generateWorkoutPlan, getCurrentWorkoutPlan, startWorkoutSession } from "../api/trainingApi";
import { ExerciseCard } from "../components/ExerciseCard";
import { TrainingHeader } from "../components/TrainingHeader";
import type { WorkoutDay, WorkoutPlan } from "../types";

function formatLabel(value: string): string { return value.replaceAll("_", " "); }
function firstDay(plan: WorkoutPlan | null | undefined): WorkoutDay | undefined { return plan?.days.slice().sort((a,b) => a.order-b.order)[0]; }
export function TrainingHomeScreen() {
  const queryClient = useQueryClient();
  const [planJustPrepared, setPlanJustPrepared] = useState(false);
  const profile = useQuery({queryKey: ["profile", "me"], queryFn: getMyProfile});
  const planQuery = useQuery({
    queryFn: getCurrentWorkoutPlan,
    queryKey: ["training", "current-plan"],
  });
  const plan = planQuery.data;
  const today = firstDay(plan);
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;

  const generateMutation = useMutation({
    onMutate: () => setPlanJustPrepared(false),
    mutationFn: () => {
      if (!profile.data) throw new Error("Your profile is still loading.");
      const p = profile.data;
      return generateWorkoutPlan({goal: p.training_goal ?? "general_fitness", experience: p.experience_level ?? "beginner", days_per_week: p.available_training_days ?? 3, session_duration_minutes: 45, equipment: p.available_equipment, activate: true});
    },
    onSuccess: (createdPlan) => {
      queryClient.setQueryData(["training", "current-plan"], createdPlan);
      setPlanJustPrepared(true);
      if (Platform.OS === "ios") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!plan?.id || !today?.key) {
        throw new Error("No workout day is ready to start.");
      }
      return startWorkoutSession(plan.id, today.key);
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
        <TrainingHeader
          title={arabic ? "نظام تمرينك" : "Your training"}
          subtitle={arabic ? "خطتك وتمارينك والكوتش بنيان متصلين بهدفك وبياناتك الحالية." : "Your plan, live workout log and Bonyan Coach stay connected to your current goal and profile."}
        />

        {planJustPrepared && plan ? <MotionReveal><SurfaceCard><View style={[styles.feedbackRow, arabic && styles.rowReverse]}><View style={styles.successIcon}><Text style={styles.successIconText}>✓</Text></View><View style={styles.feedbackCopy}><Text style={styles.feedbackTitle}>{arabic ? "الخطة جاهزة" : "Your plan is ready"}</Text><Text style={styles.stateCopy}>{arabic ? "جهزنا نظامك ويمكنك بدء أول تمرين الآن." : "Your training system is prepared and the first workout is ready."}</Text></View></View></SurfaceCard></MotionReveal> : null}

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
              disabled={generateMutation.isPending || !profile.data}
              onPress={() => generateMutation.mutate()}
              style={[styles.primaryAction, generateMutation.isPending && styles.disabledAction]}
            >
              <Text style={styles.primaryActionText}>
                {generateMutation.isPending ? arabic ? "جارٍ تجهيز الخطة…" : "Preparing your plan…" : arabic ? "توليد التمرين بالذكاء الاصطناعي" : "Generate my workout with AI"}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push("/training/manual")} style={[styles.secondaryAction, {marginTop: spacing.sm}]}>
              <Text style={styles.secondaryActionText}>{arabic ? "اختيار التمرين يدويًا" : "Choose my workout manually"}</Text>
            </Pressable>
            {generateMutation.isError ? <Text style={styles.errorText}>{arabic ? "لم نتمكن من تجهيز الخطة الآن. حاول مرة أخرى." : "We could not prepare the plan. Try again."}</Text> : null}
          </SurfaceCard>
        ) : null}

        {plan && today ? (
          <>
            <SurfaceCard>
              <View style={styles.planHeader}>
                <View style={styles.titleWrap}>
                  <Text style={styles.label}>{arabic ? "الخطة الحالية" : "CURRENT PLAN"}</Text>
                  <Text style={styles.planTitle}>{today.name}</Text>
                </View>
                <View style={styles.durationPill}>
                  <Text style={styles.durationText}>{today.estimated_minutes} {arabic ? "دقيقة" : "min"}</Text>
                </View>
              </View>
              <View style={styles.planStats}>
                <Text style={styles.stat}>{plan.days_per_week} {arabic ? "أيام / أسبوع" : "days/wk"}</Text>
                <Text style={styles.stat}>{formatLabel(plan.goal)}</Text>
                <Text style={styles.stat}>{plan.experience}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={startMutation.isPending}
                onPress={() => startMutation.mutate()}
                style={[styles.primaryAction, startMutation.isPending && styles.disabledAction]}
              >
                <Text style={styles.primaryActionText}>
                  {startMutation.isPending ? arabic ? "بنبدأ…" : "Starting…" : arabic ? "ابدأ التمرين" : "Start workout"}
                </Text>
              </Pressable>
              {startMutation.isError ? <Text style={styles.errorText}>{arabic ? "تعذر بدء التمرين. حاول مرة أخرى." : "Workout could not be started. Try again."}</Text> : null}
            </SurfaceCard>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{arabic ? "تمرين اليوم" : "Today"}</Text>
              {today.prescriptions.map((exercise, index) => (
                <ExerciseCard
                  key={`${exercise.exercise_id}-${index}`}
                  active={index === 0}
                  exercise={exercise}
                  index={index}
                />
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/training/manual")}
            style={styles.secondaryAction}
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
            disabled={generateMutation.isPending || !profile.data}
            onPress={() => generateMutation.mutate()}
            style={styles.secondaryAction}
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
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  disabledAction: {
    opacity: 0.55,
  },
  feedbackCopy: { flex: 1 },
  feedbackRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  feedbackTitle: { color: colors.positive, fontFamily: fonts.displaySemiBold, fontSize: 19, lineHeight: 25 },
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
