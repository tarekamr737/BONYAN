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
          {arabic ? "تقدم InBody" : "InBody Progress"}
        </Text>
        <Text style={styles.subtitle}>{arabic ? "سجل قياسات الجسم المؤكدة فقط." : "Confirmed body-composition history only."}</Text>

        <SurfaceCard>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>{arabic ? "التقدم" : "PROGRESS"}</Text>
            <Text style={styles.count}>{scans.length}</Text>
          </View>
          {isLoading ? <Text style={styles.stateText}>{arabic ? "بنحمّل التقارير المؤكدة…" : "Loading confirmed scans..."}</Text> : null}
          {isError ? (
            <Pressable accessibilityRole="button" onPress={() => void refetch()} style={styles.button}>
              <Text style={styles.buttonText}>{arabic ? "جرّب تاني" : "Retry"}</Text>
            </Pressable>
          ) : null}
          {!isLoading && scans.length === 0 ? (
            <Text style={styles.stateText}>{arabic ? "ارفع وأكّد تقرير InBody علشان تشوف الاتجاهات." : "Upload and confirm an InBody report to see trends."}</Text>
          ) : null}
          {!isLoading && scans.length === 1 ? (
            <Text style={styles.stateText}>
              {arabic ? "أول تقرير مؤكد هو نقطة البداية. ضيف تقرير تاني بعدين علشان تتابع تغير كل قياس مع الوقت." : "Your first confirmed report is your baseline. Add another report later to see how each measurement changes over time."}
            </Text>
          ) : null}
          {scans.length > 0 && !isError ? <View style={styles.trends}>
            <MetricTrend label={arabic ? "الوزن" : "Weight"} metric="weight" scans={scans} />
            <MetricTrend label={arabic ? "الكتلة العضلية" : "Skeletal Muscle"} metric="skeletal_muscle_mass" scans={scans} />
            <MetricTrend label={arabic ? "نسبة الدهون" : "Body Fat %"} metric="body_fat_percentage" scans={scans} />
            <MetricTrend label={arabic ? "كتلة الدهون" : "Body Fat Mass"} metric="body_fat_mass" scans={scans} />
          </View> : null}
        </SurfaceCard>

        {!isLoading && !isError ? (
          <View style={styles.nextActions}>
            <Text style={styles.nextTitle}>{arabic ? "تحب تعمل إيه بعد كده؟" : "What would you like to do next?"}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onUploadAnother}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{arabic ? "ارفع تقرير تاني" : "Upload Another Report"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onDone} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{arabic ? "ارجع لرئيسية بنيان" : "Back to BONYAN Home"}</Text>
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
