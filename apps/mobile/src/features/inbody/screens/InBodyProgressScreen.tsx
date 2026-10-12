import { phrase } from "../../../core/i18n/copy";
import { router } from "expo-router";
import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
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
  onDone = () => router.replace("/"),
  onUploadAnother = () => router.push("/inbody"),
}: InBodyProgressScreenProps = {}) {
  const arabic = useContext(LanguageDirection);
  const { data, isLoading, isError, refetch } = useQuery({
    queryFn: getInBodyHistory,
    queryKey: ["inbody", "history"],
  });
  const scans = data?.scans ?? [];

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>
          {phrase("copy_4013f058de0b", arabic)}
        </Text>
        <Text style={styles.subtitle}>{phrase("copy_b50090b89146", arabic)}</Text>

        <SurfaceCard>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>{phrase("copy_d9d4473ac585", arabic)}</Text>
            <Text style={styles.count}>{scans.length}</Text>
          </View>
          {isLoading ? <Text style={styles.stateText}>{phrase("copy_f38e404bccf3", arabic)}</Text> : null}
          {isError ? (
            <Pressable accessibilityRole="button" onPress={() => void refetch()} style={styles.button}>
              <Text style={styles.buttonText}>{phrase("copy_0aef5de01d6c", arabic)}</Text>
            </Pressable>
          ) : null}
          {!isLoading && scans.length === 0 ? (
            <Text style={styles.stateText}>{phrase("copy_ad0ec407ed2e", arabic)}</Text>
          ) : null}
          {!isLoading && scans.length === 1 ? (
            <Text style={styles.stateText}>
              {phrase("copy_58f16e0b5afa", arabic)}
            </Text>
          ) : null}
          {scans.length > 0 && !isError ? <View style={styles.trends}>
            <MetricTrend label={phrase("copy_f2d1e4db833a", arabic)} metric="weight" scans={scans} />
            <MetricTrend label={phrase("copy_7c3fc5c12d19", arabic)} metric="skeletal_muscle_mass" scans={scans} />
            <MetricTrend label={phrase("copy_1fda7d11adcd", arabic)} metric="body_fat_percentage" scans={scans} />
            <MetricTrend label={phrase("copy_4a346a19a48d", arabic)} metric="body_fat_mass" scans={scans} />
          </View> : null}
        </SurfaceCard>

        {!isLoading && !isError ? (
          <View style={styles.nextActions}>
            <Text style={styles.nextTitle}>{phrase("copy_b16e79c58dff", arabic)}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onUploadAnother}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{phrase("copy_7ee5f6961003", arabic)}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onDone} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{phrase("copy_121beeaff490", arabic)}</Text>
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
