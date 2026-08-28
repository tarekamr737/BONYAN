import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";

const buildSteps = [
  ["Measurements", 18],
  ["Body shape", 48],
  ["3D rig", 78],
  ["Ready", 100],
] as const;

export function AvatarBuildProgress({ progress, stage }: { progress: number; stage: string }) {
  return (
    <View
      accessibilityLabel="Game avatar build progress"
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: progress, text: stage }}
      style={styles.panel}
    >
      <View style={styles.topLine}>
        <Text style={styles.title}>Building your game avatar</Text>
        <Text style={styles.percent}>{progress}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.stage}>{stage}</Text>
      <View style={styles.steps}>
        {buildSteps.map(([label, threshold]) => {
          const complete = progress >= threshold;
          return (
            <View key={label} style={styles.step}>
              <View style={[styles.dot, complete && styles.dotComplete]} />
              <Text style={[styles.stepText, complete && styles.stepTextComplete]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.bronzeBorder,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  topLine: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 20 },
  percent: { color: colors.bronze, fontFamily: fonts.displaySemiBold, fontSize: 24 },
  track: { backgroundColor: colors.line, borderRadius: radii.pill, height: 8, overflow: "hidden" },
  fill: { backgroundColor: colors.bronze, borderRadius: radii.pill, height: "100%" },
  stage: { color: colors.mutedLight, fontFamily: fonts.bodyMedium, fontSize: 13 },
  steps: { gap: spacing.sm },
  step: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  dot: { backgroundColor: colors.line, borderRadius: 5, height: 10, width: 10 },
  dotComplete: { backgroundColor: colors.bronze },
  stepText: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  stepTextComplete: { color: colors.text, fontFamily: fonts.bodyMedium },
});
