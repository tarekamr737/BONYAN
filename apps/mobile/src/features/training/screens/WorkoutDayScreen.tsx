import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import {
  completeWorkoutSession,
  substituteExercise,
  getCurrentWorkoutPlan,
  getWorkoutSession,
  getWorkoutPlan,
  getExerciseMediaAccess,
  logWorkoutSet,
  startWorkoutSession,
} from "../api/trainingApi";
import { ExerciseCard } from "../components/ExerciseCard";
import { SetStepper } from "../components/SetStepper";
import { TrainingHeader } from "../components/TrainingHeader";
import type { WorkoutDay, WorkoutSession, WorkoutPlan } from "../types";

function paramValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function selectedDay(days: WorkoutDay[], dayKey: string | undefined): WorkoutDay | undefined {
  return days.find((day) => day.key === dayKey) ?? days.slice().sort((a, b) => a.order - b.order)[0];
}

function displayDayName(value: string | undefined, arabic: boolean): string {
  if (!value) return arabic ? "التمرين" : "Workout";
  return arabic && value.toLowerCase() === "custom workout" ? "تمرين مخصص" : value;
}

export function WorkoutDayScreen() {
  const arabic = useContext(LanguageDirection);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const dayKey = paramValue(params.dayKey);
  const sessionId = paramValue(params.sessionId);
  const [alternative, setAlternative] = useState<WorkoutPlan | null>(null);
  const [alternativeReason, setAlternativeReason] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [localSession, setSession] = useState<WorkoutSession | null>(null);
  const savedSession = useQuery({queryKey: ["training", "session", sessionId], enabled: Boolean(sessionId), queryFn: () => getWorkoutSession(sessionId!)});
  const session = localSession ?? savedSession.data ?? null;

  const planQuery = useQuery({
    queryFn: () => session?.plan_id ? getWorkoutPlan(session.plan_id) : getCurrentWorkoutPlan(),
    queryKey: session?.plan_id ? ["training", "plan", session.plan_id] : ["training", "current-plan"],
  });
  const plan = planQuery.data;
  const day = useMemo(() => selectedDay(plan?.days ?? [], dayKey), [dayKey, plan?.days]);
  const active = day?.prescriptions[activeIndex] ?? day?.prescriptions[0];
  const completedSets =
    session?.logged_sets.filter((item) => item.prescription_index === activeIndex).length ?? 0;
  const nextSetNumber = completedSets + 1;
  const sessionComplete = session?.status === "completed";
  const mediaQuery = useQuery({
    enabled: Boolean(active?.exercise_id),
    queryFn: () => getExerciseMediaAccess(active!.exercise_id),
    queryKey: ["training", "exercise-media", active?.exercise_id],
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!plan?.id || !day?.key) {
        throw new Error("No workout day is ready to start.");
      }
      return startWorkoutSession(plan.id, day.key);
    },
    onSuccess: (startedSession) => {
      setSession(startedSession);
      router.setParams({ dayKey: startedSession.day_key, sessionId: startedSession.id });
    },
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      if (!session?.id || !active) {
        throw new Error("Start the workout before logging sets.");
      }
      return logWorkoutSet(session.id, {
        completed: true,
        prescription_index: activeIndex,
        reps,
        set_number: nextSetNumber,
        weight_kg: weight,
      });
    },
    onSuccess: setSession,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!session?.id) {
        throw new Error("Start the workout before completing it.");
      }
      return completeWorkoutSession(session.id);
    },
    onSuccess: (completedSession) => {
      setSession(completedSession);
      queryClient.invalidateQueries({ queryKey: ["training"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today"] });
    },
  });

  const replacement = alternative?.days.find(item => item.key === day?.key)?.prescriptions[activeIndex];
  const swap = useMutation({mutationFn: (preview: boolean) => {
    if (!plan || !day) throw new Error("Workout unavailable");
    return substituteExercise({plan_id: plan.id, day_key: day.key, prescription_index: activeIndex, available_equipment: plan.equipment, ...(!preview && replacement ? {expected_exercise_id: replacement.exercise_id} : {})}, preview);
  }, onSuccess: (updated, preview) => {
    if (preview) setAlternative(updated);
    else {queryClient.setQueryData(session?.plan_id ? ["training", "plan", updated.id] : ["training", "current-plan"], updated); setAlternative(null); setAlternativeReason(false); void queryClient.invalidateQueries({queryKey: ["training"]});}
  }});
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TrainingHeader
          title={displayDayName(day?.name, arabic)}
          subtitle={arabic ? "ابدأ الجلسة وسجّل المجموعات المطلوبة، وبعد ما تخلص اقفل التمرين." : "Start the session, log prescribed sets, and complete the workout when the work is done."}
        />

        {planQuery.isPending ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{arabic ? "بنحمّل التمرين" : "Loading workout"}</Text>
            <Text style={styles.stateCopy}>{arabic ? "بنجيب الخطة النشطة للجلسة دي." : "Pulling the active plan for this session."}</Text>
          </SurfaceCard>
        ) : null}

        {planQuery.isError ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{arabic ? "التمرين مش متاح دلوقتي" : "Workout unavailable"}</Text>
            <Text style={styles.stateCopy}>{arabic ? "ما قدرناش نحمّل يوم التمرين ده." : "The training API could not load this workout day."}</Text>
            <Pressable accessibilityRole="button" onPress={() => planQuery.refetch()} style={styles.completeButton}>
              <Text style={styles.completeButtonText}>{arabic ? "جرّب تاني" : "Retry"}</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {!planQuery.isPending && !planQuery.isError && !day ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{arabic ? "مفيش يوم تمرين" : "No workout day"}</Text>
            <Text style={styles.stateCopy}>{arabic ? "جهّز خطة الأول قبل ما تبدأ جلسة تمرين." : "Generate a plan before starting a training session."}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/training")}
              style={styles.completeButton}
            >
              <Text style={styles.completeButtonText}>{arabic ? "ارجع للتمرين" : "Back to Training"}</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {sessionId && savedSession.isError ? <SurfaceCard><Text style={styles.errorText}>{arabic ? "تعذر استرجاع الجلسة. أعد المحاولة قبل تسجيل مجموعات جديدة." : "Could not restore the session. Retry before recording more sets."}</Text><Pressable accessibilityRole="button" onPress={() => void savedSession.refetch()} style={styles.completeButton}><Text style={styles.completeButtonText}>{arabic ? "إعادة المحاولة" : "Retry"}</Text></Pressable></SurfaceCard> : null}
        {day && active && (!sessionId || session) ? (
          <>
            <SurfaceCard>
              <Text style={styles.label}>{sessionComplete ? (arabic ? "اكتمل" : "COMPLETED") : (arabic ? "التمرين الحالي" : "ACTIVE EXERCISE")}</Text>
              <Text style={styles.activeName}>{active.name}</Text><Text style={styles.detail}>{arabic ? "تمرين" : "Exercise"} {activeIndex + 1} / {day.prescriptions.length}</Text>
              <Text style={styles.detail}>
                {arabic ? `${active.sets} مجموعات × ${active.reps_min}-${active.reps_max} تكرار. راحة ${Math.round(active.rest_seconds / 60)} دقيقة.` : `${active.sets} sets × ${active.reps_min}-${active.reps_max} reps. Rest ${Math.round(active.rest_seconds / 60)} minutes.`}
              </Text>
              <View style={styles.videoFrame}>
                {mediaQuery.data?.url ? (
                  <Image
                    accessibilityLabel={arabic ? `شرح تمرين ${active.name}` : `${active.name} exercise demonstration`}
                    resizeMode="contain"
                    source={{ uri: mediaQuery.data.url }}
                    style={styles.exerciseMedia}
                  />
                ) : (
                  <Text style={styles.videoText}>
                    {mediaQuery.isPending
                      ? (arabic ? "بنحمّل شرح التمرين…" : "Loading exercise demonstration...")
                      : (arabic ? "شرح التمرين مش متاح دلوقتي." : "Exercise demonstration is unavailable right now.")}
                  </Text>
                )}
              </View>
              <View style={styles.stepperRow}>
                <SetStepper arabic={arabic} label={arabic ? "التكرارات" : "Reps"} max={50} min={0} onChange={setReps} step={1} value={reps} />
                <SetStepper
                  arabic={arabic}
                  label={arabic ? "كجم" : "Kg"}
                  max={300}
                  min={0}
                  onChange={setWeight}
                  step={2.5}
                  value={weight}
                />
              </View>
              {!session ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={startMutation.isPending}
                  onPress={() => startMutation.mutate()}
                  style={[styles.logButton, startMutation.isPending && styles.disabledAction]}
                >
                  <Text style={styles.logButtonText}>{startMutation.isPending ? (arabic ? "بنبدأ…" : "Starting...") : (arabic ? "ابدأ الجلسة" : "Start session")}</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={completeMutation.isPending || logMutation.isPending || sessionComplete || nextSetNumber > active.sets}
                  onPress={() => logMutation.mutate()}
                  style={[
                    styles.logButton,
                    (logMutation.isPending || sessionComplete || nextSetNumber > active.sets) && styles.disabledAction,
                  ]}
                >
                  <Text style={styles.logButtonText}>
                    {nextSetNumber > active.sets ? (arabic ? "المجموعات اكتملت" : "Sets complete") : (arabic ? `سجّل المجموعة ${nextSetNumber}` : `Log set ${nextSetNumber}`)}
                  </Text>
                </Pressable>
              )}
              {startMutation.isError || logMutation.isError ? (
                <Text style={styles.errorText}>{arabic ? "ما قدرناش نحفظ تحديث التمرين." : "This workout update could not be saved."}</Text>
              ) : null}
            </SurfaceCard>

            {activeIndex < day.prescriptions.length - 1 ? <Pressable accessibilityRole="button" disabled={logMutation.isPending || completeMutation.isPending} style={styles.completeButton} onPress={() => setActiveIndex(index => index + 1)}><Text style={styles.completeButtonText}>{arabic ? "التمرين التالي" : "Next exercise"}</Text></Pressable> : null}
            {sessionComplete ? <SurfaceCard><Text style={styles.stateTitle}>{arabic ? "تم تسجيل التمرين" : "Workout recorded"}</Text><Text style={styles.detail}>{session.logged_sets.length} {arabic ? "مجموعات مسجلة" : "sets recorded"}</Text><Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => router.replace("/training")}><Text style={styles.completeButtonText}>{arabic ? "العودة للتدريب" : "Back to training"}</Text></Pressable></SurfaceCard> : null}
            {!sessionComplete && completedSets === 0 ? <SurfaceCard><Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => setAlternativeReason(!alternativeReason)}><Text style={styles.completeButtonText}>{arabic ? "طلب بديل للتمرين" : "Request an alternative"}</Text></Pressable>{alternativeReason ? <><Text style={styles.detail}>{arabic ? "لو السبب ألم أو إصابة، أوقف التمرين واطلب تقييم متخصص. البدائل هنا لمعدات غير متاحة أو تفضيل شخصي." : "For pain or injury, stop and seek qualified assessment. These alternatives address unavailable equipment or preference."}</Text>{[arabic ? "المعدات مش متاحة" : "Equipment unavailable", arabic ? "أفضل تمرين آخر" : "Prefer another exercise"].map(label => <Pressable key={label} accessibilityRole="button" disabled={swap.isPending} style={styles.completeButton} onPress={() => swap.mutate(true)}><Text style={styles.completeButtonText}>{label}</Text></Pressable>)}{replacement ? <><Text style={styles.activeName}>{replacement.name}</Text><Text style={styles.detail}>{replacement.equipment.join(" · ")}</Text><Pressable accessibilityRole="button" disabled={swap.isPending} style={styles.completeButton} onPress={() => swap.mutate(false)}><Text style={styles.completeButtonText}>{arabic ? "تأكيد البديل" : "Confirm alternative"}</Text></Pressable><Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => {setAlternative(null);setAlternativeReason(false);}}><Text style={styles.completeButtonText}>{arabic ? "إلغاء" : "Cancel"}</Text></Pressable></> : null}{swap.isError ? <Text style={styles.errorText}>{arabic ? "تعذر توفير البديل. جرّب تاني." : "Alternative unavailable. Please retry."}</Text> : null}</> : null}</SurfaceCard> : null}
            <View style={styles.list}>
              {day.prescriptions.map((exercise, index) => (
                <ExerciseCard
                  arabic={arabic}
                  key={`${exercise.exercise_id}-${index}`}
                  active={index === activeIndex}
                  exercise={exercise}
                  index={index}
                  onPress={() => {if (!logMutation.isPending && !completeMutation.isPending) setActiveIndex(index); setAlternative(null); setAlternativeReason(false);}}
                />
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!session || sessionComplete || completeMutation.isPending || logMutation.isPending}
              onPress={() => completeMutation.mutate()}
              style={[styles.completeButton, (!session || sessionComplete || completeMutation.isPending) && styles.disabledAction]}
            >
              <Text style={styles.completeButtonText}>
                {sessionComplete ? (arabic ? "التمرين اكتمل" : "Workout complete") : completeMutation.isPending ? (arabic ? "بنكمل…" : "Completing...") : (arabic ? "أنهِ التمرين" : "Complete workout")}
              </Text>
            </Pressable>
            {completeMutation.isError ? <Text style={styles.errorText}>{arabic ? "ما قدرناش ننهي التمرين." : "Workout could not be completed."}</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activeName: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 26,
    lineHeight: 32,
    marginTop: spacing.xs,
  },
  completeButton: {
    alignItems: "center",
    borderColor: colors.bronzeBorder,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
  },
  completeButtonText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  detail: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  disabledAction: {
    opacity: 0.55,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
  },
  exerciseMedia: {
    height: "100%",
    width: "100%",
  },
  label: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  list: {
    gap: spacing.sm,
  },
  logButton: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 58,
  },
  logButtonText: {
    color: colors.canvas,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  stateCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  stateTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    lineHeight: 28,
  },
  stepperRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  videoFrame: {
    alignItems: "center",
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.control,
    justifyContent: "center",
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  videoText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textAlign: "center",
  },
});
