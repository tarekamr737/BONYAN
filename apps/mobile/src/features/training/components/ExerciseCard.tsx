import { Pressable, StyleSheet, Text, View } from "react-native";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import type { ExercisePrescription } from "../types";

type ExerciseCardProps = {
  exercise: ExercisePrescription;
  index: number;
  active?: boolean;
  onPress?: () => void;
};

export function ExerciseCard({ exercise, index, active = false, onPress }: ExerciseCardProps) {
  const card = (
    <SurfaceCard>
      <View style={styles.row}>
        <View style={[styles.index, active && styles.activeIndex]}>
          <Text style={[styles.indexText, active && styles.activeIndexText]}>{index + 1}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.meta}>
            {exercise.sets} sets x {exercise.reps_min}-{exercise.reps_max} reps
          </Text>
        </View>
        <Text style={styles.rest}>{Math.round(exercise.rest_seconds / 60)}m</Text>
      </View>
      <View style={styles.tags}>
        {[...exercise.muscles, ...exercise.equipment].slice(0, 4).map((item) => (
          <View key={item} style={styles.tag}>
            <Text style={styles.tagText}>{item.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </SurfaceCard>
  );

  if (!onPress) {
    return card;
  }

  return (
    <Pressable
      accessibilityLabel={`${exercise.name}, ${exercise.sets} sets of ${exercise.reps_min} to ${exercise.reps_max} reps`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  activeIndex: {
    backgroundColor: colors.bronze,
  },
  activeIndexText: {
    color: colors.canvas,
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  index: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.control,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  indexText: {
    color: colors.bronze,
    fontFamily: fonts.displaySemiBold,
    fontSize: 16,
  },
  meta: {
    color: colors.mutedLight,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.78,
  },
  rest: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  tag: {
    backgroundColor: colors.bronzeSoft,
    borderColor: colors.bronzeBorder,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tagText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 0.9,
  },
});
