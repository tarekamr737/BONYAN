import { Link } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { ExerciseCard } from "../components/ExerciseCard";
import { TrainingHeader } from "../components/TrainingHeader";
import type { WorkoutPlan } from "../types";

const demoPlan: WorkoutPlan = {
  id: "demo-plan",
  status: "active",
  goal: "hypertrophy",
  experience: "intermediate",
  days_per_week: 4,
  session_duration_minutes: 55,
  equipment: ["dumbbell", "cable", "bodyweight"],
  generation_snapshot: { engine: "deterministic-v1" },
  created_at: null,
  updated_at: null,
  days: [
    {
      key: "day-1",
      order: 1,
      name: "Upper A",
      estimated_minutes: 52,
      prescriptions: [
        {
          musclewiki_id: "mw-db-press",
          name: "Dumbbell Bench Press",
          muscles: ["chest"],
          equipment: ["dumbbell"],
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          rest_seconds: 90,
          intensity_target: "RIR 1-2",
          notes: "Keep shoulder blades set before each rep.",
          progression: {
            type: "double_progression",
            increment_kg: 2.5,
            hold_after_failures: 1,
            regress_after_failures: 2,
          },
        },
        {
          musclewiki_id: "mw-row",
          name: "One Arm Dumbbell Row",
          muscles: ["back"],
          equipment: ["dumbbell"],
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          rest_seconds: 90,
          intensity_target: "RIR 1-2",
          notes: "Pause briefly with elbow beside ribs.",
          progression: {
            type: "double_progression",
            increment_kg: 2.5,
            hold_after_failures: 1,
            regress_after_failures: 2,
          },
        },
      ],
    },
  ],
};

const fallbackDay = demoPlan.days[0];

export function TrainingHomeScreen() {
  const today = useMemo(() => fallbackDay, []);

  if (!today) {
    return null;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TrainingHeader
          title="Training"
          subtitle="Today's work, current progression, and your coach in one fast gym surface."
        />

        <SurfaceCard>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.label}>CURRENT PLAN</Text>
              <Text style={styles.planTitle}>{today.name}</Text>
            </View>
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>{today.estimated_minutes} min</Text>
            </View>
          </View>
          <View style={styles.planStats}>
            <Text style={styles.stat}>{demoPlan.days_per_week} days/wk</Text>
            <Text style={styles.stat}>{demoPlan.goal.replace("_", " ")}</Text>
            <Text style={styles.stat}>{demoPlan.experience}</Text>
          </View>
          <Link asChild href={{ pathname: "/training/day", params: { day: today.key } }}>
            <Pressable accessibilityRole="button" style={styles.primaryAction}>
              <Text style={styles.primaryActionText}>Start workout</Text>
            </Pressable>
          </Link>
        </SurfaceCard>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>First exercises</Text>
          {today.prescriptions.map((exercise, index) => (
            <ExerciseCard
              key={exercise.musclewiki_id}
              active={index === 0}
              exercise={exercise}
              index={index}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Link asChild href="/training/coach">
            <Pressable accessibilityRole="button" style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Ask coach</Text>
            </Pressable>
          </Link>
          <Pressable accessibilityRole="button" style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Generate plan</Text>
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
  label: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  planHeader: {
    alignItems: "center",
    flexDirection: "row",
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
});
