import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { ExerciseCard } from "../components/ExerciseCard";
import { SetStepper } from "../components/SetStepper";
import { TrainingHeader } from "../components/TrainingHeader";

const exercises = [
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
];

export function WorkoutDayScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(22.5);
  const active = exercises[activeIndex] ?? exercises[0];

  if (!active) {
    return null;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TrainingHeader
          title="Upper A"
          subtitle="Log the set in two taps. Details stay visible without interrupting the lift."
        />

        <SurfaceCard>
          <Text style={styles.label}>ACTIVE EXERCISE</Text>
          <Text style={styles.activeName}>{active.name}</Text>
          <Text style={styles.detail}>
            {active.sets} sets x {active.reps_min}-{active.reps_max} reps. Rest{" "}
            {Math.round(active.rest_seconds / 60)} minutes.
          </Text>
          <View style={styles.videoFrame}>
            <Text style={styles.videoText}>MuscleWiki video loads here</Text>
          </View>
          <View style={styles.stepperRow}>
            <SetStepper label="Reps" max={30} min={0} onChange={setReps} step={1} value={reps} />
            <SetStepper
              label="Kg"
              max={300}
              min={0}
              onChange={setWeight}
              step={2.5}
              value={weight}
            />
          </View>
          <Pressable accessibilityRole="button" style={styles.logButton}>
            <Text style={styles.logButtonText}>Log set 1</Text>
          </Pressable>
        </SurfaceCard>

        <View style={styles.list}>
          {exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.musclewiki_id}
              active={index === activeIndex}
              exercise={exercise}
              index={index}
              onPress={() => setActiveIndex(index)}
            />
          ))}
        </View>

        <Pressable accessibilityRole="button" style={styles.completeButton}>
          <Text style={styles.completeButtonText}>Complete workout</Text>
        </Pressable>
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
  },
  videoText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
});
