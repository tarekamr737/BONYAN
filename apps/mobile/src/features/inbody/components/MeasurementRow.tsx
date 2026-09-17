import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { useContext } from "react";
import { StyleSheet, View } from "react-native";

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

const labelsArabic: Record<string, string> = {
  height: "الطول",
  weight: "الوزن",
  skeletal_muscle_mass: "الكتلة العضلية",
  body_fat_mass: "كتلة الدهون",
  body_fat_percentage: "نسبة الدهون",
  bmi: "مؤشر كتلة الجسم",
  total_body_water: "مياه الجسم",
  visceral_fat_level: "الدهون الحشوية",
  inbody_score: "نتيجة InBody",
};

export function measurementLabel(key: string, arabic: boolean): string {
  return (arabic ? labelsArabic : labels)[key] ?? key;
}

function reviewFlag(flag: string, arabic: boolean): string {
  if (!arabic) return flag.replaceAll("_", " ");
  return ({
    derived: "محسوب من قياسات أخرى",
    implausible_value: "قيمة غير منطقية",
    low_confidence: "ثقة القراءة منخفضة",
    missing: "غير موجود",
    negative_value: "قيمة سالبة",
    unknown_unit: "وحدة غير معروفة",
  } as Record<string, string>)[flag] ?? flag.replaceAll("_", " ");
}

export function MeasurementRow({ measurement }: { measurement: InBodyMeasurement }) {
  const arabic = useContext(LanguageDirection);
  const flags = measurement.metadata.flags;
  const needsReview = flags.length > 0;
  const value =
    measurement.value === null
      ? arabic ? "غير موجود" : "Missing"
      : `${measurement.value.toFixed(1)}${measurement.unit ? ` ${arabic && measurement.unit === "score" ? "نقطة" : measurement.unit}` : ""}`;

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{measurementLabel(measurement.key, arabic)}</Text>
        {needsReview ? <Text style={styles.flag}>{flags.map((flag) => reviewFlag(flag, arabic)).join("، ")}</Text> : null}
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
