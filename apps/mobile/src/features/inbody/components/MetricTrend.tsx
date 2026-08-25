import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import type { InBodyMetricKey, InBodyScan } from "../types";

type Props = {
  label: string;
  metric: InBodyMetricKey;
  scans: InBodyScan[];
};

function getMetricValue(scan: InBodyScan, metric: InBodyMetricKey): number | null {
  return scan.result?.measurements.find((item) => item.key === metric)?.value ?? null;
}

export function MetricTrend({ label, metric, scans }: Props) {
  const values = scans
    .map((scan) => getMetricValue(scan, metric))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);
  const latest = values[values.length - 1] as number;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{latest.toFixed(1)}</Text>
      </View>
      <View style={styles.bars} accessibilityLabel={`${label} trend chart`}>
        {values.map((value, index) => (
          <View
            key={`${metric}-${index}`}
            style={[
              styles.bar,
              { height: 18 + ((value - min) / spread) * 58 },
              index === values.length - 1 ? styles.currentBar : undefined,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    padding: spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: colors.mutedLight,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  value: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
  },
  bars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.xs,
    height: 84,
    marginTop: spacing.md,
  },
  bar: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.pill,
    flex: 1,
    minWidth: 10,
  },
  currentBar: {
    backgroundColor: colors.bronze,
  },
});
