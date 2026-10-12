import {measurementLabel, measurementUnit, reviewFlag} from "../../../core/i18n/measurements";
import {formatNumber} from "../../../core/i18n/messages";
import { phrase } from "../../../core/i18n/copy";
import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { useContext } from "react";
import { StyleSheet, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import type { InBodyMeasurement } from "../types";

export {measurementLabel} from "../../../core/i18n/measurements";
export function MeasurementRow({ measurement }: { measurement: InBodyMeasurement }) {
  const arabic = useContext(LanguageDirection);
  const flags = measurement.metadata.flags;
  const needsReview = flags.length > 0;
  const value =
    measurement.value === null
      ? phrase("copy_8b935eb10782", arabic)
      : `${formatNumber(measurement.value, arabic ? "ar-EG" : "en", {maximumFractionDigits: 1})}${measurement.unit ? ` ${measurementUnit(measurement.unit, arabic ? "ar-EG" : "en")}` : ""}`;

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
