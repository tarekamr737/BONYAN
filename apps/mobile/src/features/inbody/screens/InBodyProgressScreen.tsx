import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { getInBodyHistory } from "../api/inbodyApi";
import { MetricTrend } from "../components/MetricTrend";

type InBodyProgressScreenProps = {
  onDone?: () => void;
  onUploadAnother?: () => void;
};

export function InBodyProgressScreen({
  onDone,
  onUploadAnother,
}: InBodyProgressScreenProps = {}) {
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
          {!isLoading && scans.length === 1 ? (
            <Text style={styles.stateText}>
              Your first confirmed report is your baseline. Add another report later to see how
              each measurement changes over time.
            </Text>
          ) : null}
          <View style={styles.trends}>
            <MetricTrend label="Weight" metric="weight" scans={scans} />
            <MetricTrend label="Skeletal Muscle" metric="skeletal_muscle_mass" scans={scans} />
            <MetricTrend label="Body Fat %" metric="body_fat_percentage" scans={scans} />
            <MetricTrend label="Body Fat Mass" metric="body_fat_mass" scans={scans} />
          </View>
        </SurfaceCard>

        {!isLoading && !isError ? (
          <View style={styles.nextActions}>
            <Text style={styles.nextTitle}>What would you like to do next?</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onUploadAnother}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Upload Another Report</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onDone} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Back to BONYAN Home</Text>
            </Pressable>
          </View>
        ) : null}
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
  nextActions: {
    gap: spacing.sm,
  },
  nextTitle: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 50,
  },
  primaryButtonText: {
    color: colors.canvas,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.bronzeBorder,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  secondaryButtonText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
});
