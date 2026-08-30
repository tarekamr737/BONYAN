import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { completeWorkoutSession, getCurrentWorkoutPlan, logWorkoutSet, startWorkoutSession } from "../api/trainingApi";
import { ExerciseCard } from "../components/ExerciseCard";
import { SetStepper } from "../components/SetStepper";
import { TrainingHeader } from "../components/TrainingHeader";
import type { WorkoutDay, WorkoutSession } from "../types";

function paramValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function selectedDay(days: WorkoutDay[], dayKey: string | undefined): WorkoutDay | undefined {
  return days.find((day) => day.key === dayKey) ?? days.slice().sort((a, b) => a.order - b.order)[0];
}

export function WorkoutDayScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const dayKey = paramValue(params.dayKey);
  const sessionId = paramValue(params.sessionId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(20);
  const [session, setSession] = useState<WorkoutSession | null>(
    sessionId
      ? {
          completed_at: null,
          day_key: dayKey ?? "",
          id: sessionId,
          logged_sets: [],
          plan_id: "",
          started_at: "",
          status: "active",
          summary: {},
        }
      : null,
  );

  const planQuery = useQuery({
    queryFn: getCurrentWorkoutPlan,
    queryKey: ["training", "current-plan"],
  });
  const plan = planQuery.data;
  const day = useMemo(() => selectedDay(plan?.days ?? [], dayKey), [dayKey, plan?.days]);
  const active = day?.prescriptions[activeIndex] ?? day?.prescriptions[0];
  const completedSets =
    session?.logged_sets.filter((item) => item.prescription_index === activeIndex).length ?? 0;
  const nextSetNumber = completedSets + 1;
  const sessionComplete = session?.status === "completed";

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
    },
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TrainingHeader
          title={day?.name ?? "Workout"}
          subtitle="Start the session, log prescribed sets, and complete the workout when the work is done."
        />

        {planQuery.isPending ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>Loading workout</Text>
            <Text style={styles.stateCopy}>Pulling the active plan for this session.</Text>
          </SurfaceCard>
        ) : null}

        {planQuery.isError ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>Workout unavailable</Text>
            <Text style={styles.stateCopy}>The training API could not load this workout day.</Text>
            <Pressable accessibilityRole="button" onPress={() => planQuery.refetch()} style={styles.completeButton}>
              <Text style={styles.completeButtonText}>Retry</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {!planQuery.isPending && !planQuery.isError && !day ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>No workout day</Text>
            <Text style={styles.stateCopy}>Generate a plan before starting a training session.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push("/training")} style={styles.completeButton}>
              <Text style={styles.completeButtonText}>Back to Training</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {day && active ? (
          <>
            <SurfaceCard>
              <Text style={styles.label}>{sessionComplete ? "COMPLETED" : "ACTIVE EXERCISE"}</Text>
              <Text style={styles.activeName}>{active.name}</Text>
              <Text style={styles.detail}>
                {active.sets} sets x {active.reps_min}-{active.reps_max} reps. Rest{" "}
                {Math.round(active.rest_seconds / 60)} minutes.
              </Text>
              <View style={styles.videoFrame}>
                <Text style={styles.videoText}>MuscleWiki media will appear when access is available.</Text>
              </View>
              <View style={styles.stepperRow}>
                <SetStepper label="Reps" max={50} min={0} onChange={setReps} step={1} value={reps} />
                <SetStepper
                  label="Kg"
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
                  <Text style={styles.logButtonText}>{startMutation.isPending ? "Starting..." : "Start session"}</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={logMutation.isPending || sessionComplete || nextSetNumber > active.sets}
                  onPress={() => logMutation.mutate()}
                  style={[
                    styles.logButton,
                    (logMutation.isPending || sessionComplete || nextSetNumber > active.sets) && styles.disabledAction,
                  ]}
                >
                  <Text style={styles.logButtonText}>
                    {nextSetNumber > active.sets ? "Sets complete" : `Log set ${nextSetNumber}`}
                  </Text>
                </Pressable>
              )}
              {startMutation.isError || logMutation.isError ? (
                <Text style={styles.errorText}>This workout update could not be saved.</Text>
              ) : null}
            </SurfaceCard>

            <View style={styles.list}>
              {day.prescriptions.map((exercise, index) => (
                <ExerciseCard
                  key={`${exercise.musclewiki_id}-${index}`}
                  active={index === activeIndex}
                  exercise={exercise}
                  index={index}
                  onPress={() => setActiveIndex(index)}
                />
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!session || sessionComplete || completeMutation.isPending}
              onPress={() => completeMutation.mutate()}
              style={[styles.completeButton, (!session || sessionComplete || completeMutation.isPending) && styles.disabledAction]}
            >
              <Text style={styles.completeButtonText}>
                {sessionComplete ? "Workout complete" : completeMutation.isPending ? "Completing..." : "Complete workout"}
              </Text>
            </Pressable>
            {completeMutation.isError ? <Text style={styles.errorText}>Workout could not be completed.</Text> : null}
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
