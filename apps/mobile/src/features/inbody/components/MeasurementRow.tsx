import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import type { InBodyMeasurement } from "../types";

const labels: Record<string, string> = {
  height: "Height",
  weight: "Weight",
  skeletal_muscle_mass: "Skeletal muscle",
  body_fat_mass: "Body fat mass",
  body_fat_percentage: "Body fat",
  bmi: "BMI",
  total_body_water: "Total body water",
  visceral_fat_level: "Visceral fat",
  inbody_score: "InBody score",
};

export function MeasurementRow({ measurement }: { measurement: InBodyMeasurement }) {
  const flags = measurement.metadata.flags;
  const needsReview = flags.length > 0;
  const value =
    measurement.value === null
      ? "Missing"
      : `${measurement.value.toFixed(1)}${measurement.unit ? ` ${measurement.unit}` : ""}`;

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{labels[measurement.key] ?? measurement.key}</Text>
        {needsReview ? <Text style={styles.flag}>{flags.join(", ")}</Text> : null}
      </View>
      <View style={[styles.badge, needsReview ? styles.reviewBadge : styles.readyBadge]}>
        <Text style={[styles.value, needsReview ? styles.reviewText : styles.readyText]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 62,
    paddingVertical: spacing.sm,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  flag: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xxs,
  },
  badge: {
    borderRadius: radii.pill,
    minWidth: 86,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  readyBadge: {
    backgroundColor: colors.bronzeSoft,
  },
  reviewBadge: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.bronzeBorder,
    borderWidth: 1,
  },
  value: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    textAlign: "center",
  },
  readyText: {
    color: colors.bronze,
  },
  reviewText: {
    color: colors.mutedLight,
  },
});
