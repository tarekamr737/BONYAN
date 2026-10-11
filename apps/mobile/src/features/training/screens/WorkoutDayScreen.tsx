import { phrase } from "../../../core/i18n/copy";
import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
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
import { selectWorkoutDay } from "../selectWorkoutDay";
import { planNeedsRefresh, planRefreshMessage } from "../planIntegrity";
import type { WorkoutSession, WorkoutPlan } from "../types";

function paramValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function displayDayName(value: string | undefined, arabic: boolean): string {
  if (!value) return phrase("copy_3c088a2a4e7a", arabic);
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
  const [failedMediaUrl, setFailedMediaUrl] = useState<string | null>(null);
  const savedSession = useQuery({queryKey: ["training", "session", sessionId], enabled: Boolean(sessionId), queryFn: () => getWorkoutSession(sessionId!)});
  const session = localSession && (!sessionId || localSession.id === sessionId)
    ? localSession
    : savedSession.data ?? null;

  const planQuery = useQuery({
    enabled: !sessionId || Boolean(session),
    queryFn: () => session?.plan_id ? getWorkoutPlan(session.plan_id) : getCurrentWorkoutPlan(),
    queryKey: session?.plan_id ? ["training", "plan", session.plan_id] : ["training", "current-plan"],
  });
  const plan = planQuery.data;
  const needsRefresh = planNeedsRefresh(plan);
  const day = useMemo(() => selectWorkoutDay(plan?.days ?? [], dayKey, session?.day_key), [dayKey, plan?.days, session?.day_key]);
  const active = day?.prescriptions[activeIndex] ?? day?.prescriptions[0];
  const placeholderExercise = active?.exercise_id.startsWith("fallback-") ?? false;
  const completedSets =
    session?.logged_sets.filter((item) => item.prescription_index === activeIndex).length ?? 0;
  const nextSetNumber = completedSets + 1;
  const sessionComplete = session?.status === "completed";
  const mediaQuery = useQuery({
    enabled: Boolean(active?.exercise_id) && !placeholderExercise,
    queryFn: () => getExerciseMediaAccess(active!.exercise_id),
    queryKey: ["training", "exercise-media", active?.exercise_id],
  });
  const noDemonstration = mediaQuery.isSuccess && !mediaQuery.data?.url;

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
          subtitle={day ? (arabic ? `${day.prescriptions.length} تمارين` : `${day.prescriptions.length} exercises`) : ""}
        />

        {sessionId && !session && savedSession.isPending ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{phrase("copy_99efe666a4a1", arabic)}</Text>
          </SurfaceCard>
        ) : null}

        {(!sessionId || session) && planQuery.isPending ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{phrase("copy_198116c26fad", arabic)}</Text>
          </SurfaceCard>
        ) : null}

        {planQuery.isError ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{phrase("copy_26d85bd5316d", arabic)}</Text>
            <Pressable accessibilityRole="button" onPress={() => planQuery.refetch()} style={styles.completeButton}>
              <Text style={styles.completeButtonText}>{phrase("copy_0aef5de01d6c", arabic)}</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {!planQuery.isPending && !planQuery.isError && !day ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>{phrase("copy_480df73fe366", arabic)}</Text>
            <Text style={styles.stateCopy}>{phrase("copy_98e859472f0b", arabic)}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/training")}
              style={styles.completeButton}
            >
              <Text style={styles.completeButtonText}>{phrase("copy_3a8f0dbac970", arabic)}</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {needsRefresh ? <SurfaceCard><Text accessibilityRole="alert" style={styles.stateCopy}>{planRefreshMessage(arabic)}</Text><Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => router.replace("/training")}><Text style={styles.completeButtonText}>{phrase("copy_4fbb7fee1e9e", arabic)}</Text></Pressable></SurfaceCard> : null}
        {sessionId && savedSession.isError ? <SurfaceCard><Text style={styles.errorText}>{phrase("copy_282999cf84e4", arabic)}</Text><Pressable accessibilityRole="button" onPress={() => void savedSession.refetch()} style={styles.completeButton}><Text style={styles.completeButtonText}>{phrase("copy_bb30cda7c34e", arabic)}</Text></Pressable></SurfaceCard> : null}
        {day && active && (!sessionId || session) ? (
          <>
            <SurfaceCard>
              <Text style={styles.activeName}>{active.name}</Text><Text style={styles.detail}>{activeIndex + 1} / {day.prescriptions.length}</Text>
              <Text style={styles.detail}>
                {arabic ? `${active.sets} مجموعات × ${active.reps_min}-${active.reps_max} تكرار · راحة ${Math.round(active.rest_seconds / 60)} دقائق` : `${active.sets} sets × ${active.reps_min}-${active.reps_max} reps · ${Math.round(active.rest_seconds / 60)} min rest`}
              </Text>
              <View style={styles.videoFrame}>
                {mediaQuery.data?.url && failedMediaUrl !== mediaQuery.data.url ? (
                  <Image
                    accessibilityLabel={arabic ? `شرح تمرين ${active.name}` : `${active.name} exercise demonstration`}
                    contentFit="contain"
                    onError={() => setFailedMediaUrl(mediaQuery.data?.url ?? null)}
                    source={{ uri: mediaQuery.data.url, headers: { "User-Agent": "BONYAN/1.0" } }}
                    style={styles.exerciseMedia}
                  />
                ) : (
                  <Pressable
                    accessibilityRole={mediaQuery.isPending || placeholderExercise || noDemonstration ? undefined : "button"}
                    disabled={mediaQuery.isPending || placeholderExercise || noDemonstration}
                    style={styles.mediaRetry}
                    onPress={() => { setFailedMediaUrl(null); void mediaQuery.refetch(); }}
                  >
                    <Text style={styles.videoText}>
                      {placeholderExercise
                        ? (phrase("copy_fd416d6e6f1c", arabic))
                        : noDemonstration
                        ? (phrase("copy_a921cc49ec65", arabic))
                        : mediaQuery.isPending
                        ? (phrase("copy_a6e8ff074c0e", arabic))
                        : (phrase("copy_a3cea479915e", arabic))}
                    </Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.stepperRow}>
                <SetStepper arabic={arabic} label={phrase("copy_85ba154f815e", arabic)} max={50} min={0} onChange={setReps} step={1} value={reps} />
                <SetStepper
                  arabic={arabic}
                  label={phrase("copy_2fb6ec488d9a", arabic)}
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
                  disabled={needsRefresh || startMutation.isPending}
                  onPress={() => startMutation.mutate()}
                  style={[styles.logButton, (needsRefresh || startMutation.isPending) && styles.disabledAction]}
                >
                  <Text style={styles.logButtonText}>{startMutation.isPending ? (phrase("copy_0d3f000d39a0", arabic)) : (phrase("copy_51cc7ab66cf6", arabic))}</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={placeholderExercise || completeMutation.isPending || logMutation.isPending || sessionComplete || nextSetNumber > active.sets}
                  onPress={() => logMutation.mutate()}
                  style={[
                    styles.logButton,
                    (placeholderExercise || logMutation.isPending || sessionComplete || nextSetNumber > active.sets) && styles.disabledAction,
                  ]}
                >
                  <Text style={styles.logButtonText}>
                    {nextSetNumber > active.sets ? (phrase("copy_e3b75f09ab2d", arabic)) : (arabic ? `سجّل المجموعة ${nextSetNumber}` : `Log set ${nextSetNumber}`)}
                  </Text>
                </Pressable>
              )}
              {startMutation.isError || logMutation.isError ? (
                <Text style={styles.errorText}>{phrase("copy_3c8a982a67e3", arabic)}</Text>
              ) : null}
            </SurfaceCard>

            {activeIndex < day.prescriptions.length - 1 ? <Pressable accessibilityRole="button" disabled={logMutation.isPending || completeMutation.isPending || swap.isPending} style={styles.completeButton} onPress={() => { setActiveIndex(index => index + 1); setAlternative(null); setAlternativeReason(false); }}><Text style={styles.completeButtonText}>{phrase("copy_2b5f2b340a3f", arabic)}</Text></Pressable> : null}
            {sessionComplete ? <SurfaceCard><Text style={styles.stateTitle}>{phrase("copy_373f1549859f", arabic)}</Text><Text style={styles.detail}>{session.logged_sets.length} {phrase("copy_a91f53f9767a", arabic)}</Text><Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => router.replace("/training")}><Text style={styles.completeButtonText}>{phrase("copy_4fbb7fee1e9e", arabic)}</Text></Pressable></SurfaceCard> : null}
            {!sessionComplete && completedSets === 0 ? <SurfaceCard><Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => setAlternativeReason(!alternativeReason)}><Text style={styles.completeButtonText}>{phrase("copy_0eeb6d2faa70", arabic)}</Text></Pressable>{alternativeReason ? <><Text style={styles.detail}>{phrase("copy_85c50705251d", arabic)}</Text>{[phrase("copy_31fd0baf89d0", arabic), phrase("copy_b31914ccf429", arabic)].map(label => <Pressable key={label} accessibilityRole="button" disabled={swap.isPending} style={styles.completeButton} onPress={() => swap.mutate(true)}><Text style={styles.completeButtonText}>{label}</Text></Pressable>)}{replacement ? <><Text style={styles.activeName}>{replacement.name}</Text><Text style={styles.detail}>{replacement.equipment.join(" · ")}</Text><Pressable accessibilityRole="button" disabled={swap.isPending} style={styles.completeButton} onPress={() => swap.mutate(false)}><Text style={styles.completeButtonText}>{phrase("copy_c5163118f200", arabic)}</Text></Pressable><Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => {setAlternative(null);setAlternativeReason(false);}}><Text style={styles.completeButtonText}>{phrase("copy_428808b5e23b", arabic)}</Text></Pressable></> : null}{swap.isError ? <Text style={styles.errorText}>{phrase("copy_eeedb2b570f0", arabic)}</Text> : null}</> : null}</SurfaceCard> : null}
            <View style={styles.list}>
              {day.prescriptions.map((exercise, index) => (
                <ExerciseCard
                  arabic={arabic}
                  key={`${exercise.exercise_id}-${index}`}
                  active={index === activeIndex}
                  exercise={exercise}
                  index={index}
                  onPress={() => {if (logMutation.isPending || completeMutation.isPending || swap.isPending) return; setActiveIndex(index); setAlternative(null); setAlternativeReason(false);}}
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
                {sessionComplete ? (phrase("copy_8239294ae760", arabic)) : completeMutation.isPending ? (phrase("copy_e406f91cd7ae", arabic)) : (phrase("copy_02092457a239", arabic))}
              </Text>
            </Pressable>
            {completeMutation.isError ? <Text style={styles.errorText}>{phrase("copy_5b78311a1bf2", arabic)}</Text> : null}
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
    textAlign: "center",
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
    alignSelf: "center",
    flexGrow: 1,
    gap: spacing.md,
    maxWidth: 660,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: "100%",
  },
  detail: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: "center",
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
  mediaRetry: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    padding: spacing.md,
    width: "100%",
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
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "center",
    marginTop: spacing.lg,
    width: "100%",
  },
  videoFrame: {
    alignItems: "center",
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.control,
    justifyContent: "center",
    marginTop: spacing.lg,
    overflow: "hidden",
    width: "100%",
  },
  videoText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textAlign: "center",
  },
});
