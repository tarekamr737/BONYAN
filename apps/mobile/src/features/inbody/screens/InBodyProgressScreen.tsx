import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { getInBodyHistory } from "../api/inbodyApi";
import { MetricTrend } from "../components/MetricTrend";

export function InBodyProgressScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryFn: getInBodyHistory,
    queryKey: ["inbody", "history"],
  });
  const scans = data?.scans ?? [];

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>
          InBody Progress
        </Text>
        <Text style={styles.subtitle}>Confirmed body-composition history only.</Text>

        <SurfaceCard>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>PROGRESS</Text>
            <Text style={styles.count}>{scans.length}</Text>
          </View>
          {isLoading ? <Text style={styles.stateText}>Loading confirmed scans...</Text> : null}
          {isError ? (
            <Pressable accessibilityRole="button" onPress={() => void refetch()} style={styles.button}>
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
          ) : null}
          {!isLoading && scans.length === 0 ? (
            <Text style={styles.stateText}>Upload and confirm an InBody report to see trends.</Text>
          ) : null}
          <View style={styles.trends}>
            <MetricTrend label="Weight" metric="weight" scans={scans} />
            <MetricTrend label="Skeletal Muscle" metric="skeletal_muscle_mass" scans={scans} />
            <MetricTrend label="Body Fat %" metric="body_fat_percentage" scans={scans} />
            <MetricTrend label="Body Fat Mass" metric="body_fat_mass" scans={scans} />
          </View>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 38,
    lineHeight: 43,
  },
  subtitle: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardLabel: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  count: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 28,
  },
  stateText: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.lg,
  },
  trends: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    minHeight: 48,
    justifyContent: "center",
    marginTop: spacing.md,
  },
  buttonText: {
    color: colors.canvas,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
});
