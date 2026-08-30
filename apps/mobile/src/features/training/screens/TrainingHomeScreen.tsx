import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { generateWorkoutPlan, getCurrentWorkoutPlan, startWorkoutSession } from "../api/trainingApi";
import { ExerciseCard } from "../components/ExerciseCard";
import { TrainingHeader } from "../components/TrainingHeader";
import type { GeneratePlanRequest, WorkoutDay, WorkoutPlan } from "../types";

const defaultRequest: GeneratePlanRequest = {
  activate: true,
  days_per_week: 3,
  equipment: ["bodyweight", "dumbbell"],
  experience: "beginner",
  goal: "general_fitness",
  session_duration_minutes: 45,
};

function formatLabel(value: string): string {
  return value.replace("_", " ");
}

function firstDay(plan: WorkoutPlan | null | undefined): WorkoutDay | undefined {
  return plan?.days.slice().sort((a, b) => a.order - b.order)[0];
}

export function TrainingHomeScreen() {
  const queryClient = useQueryClient();
  const planQuery = useQuery({
    queryFn: getCurrentWorkoutPlan,
    queryKey: ["training", "current-plan"],
  });
  const plan = planQuery.data;
  const today = firstDay(plan);

  const generateMutation = useMutation({
    mutationFn: () => generateWorkoutPlan(defaultRequest),
    onSuccess: (createdPlan) => {
      queryClient.setQueryData(["training", "current-plan"], createdPlan);
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
        pathname: "./day",
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
          title="Training"
          subtitle="Your current plan, live session logging, and coach support stay synced with BONYAN."
        />

        {planQuery.isPending ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>Loading your plan</Text>
            <Text style={styles.stateCopy}>Checking the active training cycle for this account.</Text>
          </SurfaceCard>
        ) : null}

        {planQuery.isError ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>Plan unavailable</Text>
            <Text style={styles.stateCopy}>
              The training API could not load your current plan. Retry when the connection is back.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => planQuery.refetch()} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Retry</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {!planQuery.isPending && !planQuery.isError && !plan ? (
          <SurfaceCard>
            <Text style={styles.stateTitle}>No active plan yet</Text>
            <Text style={styles.stateCopy}>
              Generate a deterministic starter plan from your profile defaults and latest confirmed InBody data when
              available.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={generateMutation.isPending}
              onPress={() => generateMutation.mutate()}
              style={[styles.primaryAction, generateMutation.isPending && styles.disabledAction]}
            >
              <Text style={styles.primaryActionText}>
                {generateMutation.isPending ? "Generating..." : "Generate plan"}
              </Text>
            </Pressable>
            {generateMutation.isError ? <Text style={styles.errorText}>Plan generation failed. Try again.</Text> : null}
          </SurfaceCard>
        ) : null}

        {plan && today ? (
          <>
            <SurfaceCard>
              <View style={styles.planHeader}>
                <View style={styles.titleWrap}>
                  <Text style={styles.label}>CURRENT PLAN</Text>
                  <Text style={styles.planTitle}>{today.name}</Text>
                </View>
                <View style={styles.durationPill}>
                  <Text style={styles.durationText}>{today.estimated_minutes} min</Text>
                </View>
              </View>
              <View style={styles.planStats}>
                <Text style={styles.stat}>{plan.days_per_week} days/wk</Text>
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
                  {startMutation.isPending ? "Starting..." : "Start workout"}
                </Text>
              </Pressable>
              {startMutation.isError ? <Text style={styles.errorText}>Workout could not be started.</Text> : null}
            </SurfaceCard>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today</Text>
              {today.prescriptions.map((exercise, index) => (
                <ExerciseCard
                  key={`${exercise.musclewiki_id}-${index}`}
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
            onPress={() => router.push("./coach")}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionText}>Ask coach</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={generateMutation.isPending}
            onPress={() => generateMutation.mutate()}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionText}>
              {generateMutation.isPending ? "Generating..." : plan ? "Replace plan" : "Generate plan"}
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
