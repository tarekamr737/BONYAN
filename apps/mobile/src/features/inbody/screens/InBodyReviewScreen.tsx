import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { router } from "expo-router";
import { AppButton } from "../../../core/components";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useContext, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "../../../core/api/errors";
import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { confirmInBodyScan, getInBodyScan, updateInBodyReview } from "../api/inbodyApi";
import { MeasurementRow, measurementLabel } from "../components/MeasurementRow";
import { getInBodyReviewState } from "../reviewState";
import type { InBodyMeasurement } from "../types";

type Props = {
  scanId: string;
  onConfirmed?: () => void;
};

export function InBodyReviewScreen({ scanId, onConfirmed }: Props) {
  const arabic = useContext(LanguageDirection);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const { data, isError, isLoading, refetch } = useQuery({
    queryFn: () => getInBodyScan(scanId),
    queryKey: ["inbody", "scan", scanId],
  });
  const measurements = data?.result?.measurements ?? [];
  const reviewState = getInBodyReviewState(data);

  const saveMutation = useMutation({
    mutationFn: () => updateInBodyReview(scanId, buildEditedMeasurements(measurements, draftValues), data?.result?.scan_date ?? null),
  });
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (Object.keys(draftValues).length > 0 && data?.result) {
        await updateInBodyReview(
          scanId,
          buildEditedMeasurements(measurements, draftValues),
          data.result.scan_date,
        );
      }
      return confirmInBodyScan(scanId);
    },
    onSuccess: onConfirmed,
  });

  function updateValue(key: string, value: string) {
    setDraftValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>
          {arabic ? "راجع التقرير" : "Review Scan"}
        </Text>
        <Text style={styles.subtitle}>{arabic ? "أكّد بس القيم اللي مطابقة لتقريرك." : "Confirm only values that match your report."}</Text>

        <SurfaceCard>
          {isLoading ? <Text style={styles.stateText}>{arabic ? "بنقرأ التقرير…" : "Reading scan..."}</Text> : null}
          {isError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void refetch()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{arabic ? "جرّب تحميل التقرير تاني" : "Retry Loading Scan"}</Text>
            </Pressable>
          ) : null}
          {reviewState === "failed" ? (
            <View style={styles.failedState}>
              <Text accessibilityRole="alert" style={styles.errorText}>
                {arabic ? "ما قدرناش نعالج التقرير ده." : data?.failure_message ?? "This report could not be processed."}
              </Text>
              <Text style={styles.subtitle}>
                {arabic ? "التقرير ما اتأكدش. جرّب ترفعه تاني، أو ضيف القياسات يدويًا من ملفك الشخصي." : "Your report has not been confirmed. Try uploading it again, or add measurements manually from your profile."}
              </Text>
              <AppButton label={arabic ? "ارفع التقرير تاني" : "Try uploading again"} onPress={() => router.replace("/inbody")} />
              <AppButton label={arabic ? "اكتب القياسات يدويًا" : "Enter measurements manually"} variant="secondary" onPress={() => router.replace("/profile")} />
            </View>
          ) : reviewState === "confirmed" ? (
            <View style={styles.confirmedState}>
              <Text style={styles.confirmedTitle}>{arabic ? "التقرير ده متأكد بالفعل" : "This report is already confirmed"}</Text>
              <Text style={styles.stateText}>
                {arabic ? "بنيان تعرّف على تقرير حفظته قبل كده. هو موجود بالفعل في سجل تقدمك ومش محتاج تأكيد تاني." : "BONYAN recognized a report you previously saved. It is already included in your progress history, so there is nothing to confirm again."}
              </Text>
              <Pressable accessibilityRole="button" onPress={onConfirmed} style={styles.button}>
                <Text style={styles.buttonText}>{arabic ? "شوف تقدم InBody" : "View InBody Progress"}</Text>
              </Pressable>
            </View>
          ) : reviewState === "review" ? (
            <>
              {measurements.map((measurement) => (
                <View key={measurement.key} style={styles.editRow}>
                  <MeasurementRow measurement={measurement} />
                  <TextInput
                    accessibilityLabel={arabic ? `صحّح ${measurementLabel(measurement.key, true)}` : `Correct ${measurementLabel(measurement.key, false)}`}
                    keyboardType="decimal-pad"
                    onChangeText={(value) => updateValue(measurement.key, value)}
                    placeholder={arabic ? "القيمة" : "Value"}
                    placeholderTextColor={colors.muted}
                    style={[styles.input, arabic && styles.inputArabic]}
                    value={draftValues[measurement.key] ?? (measurement.value === null ? "" : String(measurement.value))}
                  />
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                disabled={!data?.result || saveMutation.isPending}
                onPress={() => saveMutation.mutate()}
                style={[styles.secondaryButton, !data?.result ? styles.disabledButton : undefined]}
              >
                <Text style={styles.secondaryButtonText}>
                  {saveMutation.isPending ? (arabic ? "بنحفظ…" : "Saving...") : (arabic ? "احفظ التعديلات" : "Save Corrections")}
                </Text>
              </Pressable>
              {saveMutation.isError ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {arabic ? "ما قدرناش نحفظ التعديلات. جرّب تاني." : reviewErrorMessage(saveMutation.error, "Corrections could not be saved. Please retry.")}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={!data?.result || confirmMutation.isPending || saveMutation.isPending}
                onPress={() => confirmMutation.mutate()}
                style={[
                  styles.button,
                  !data?.result || saveMutation.isPending ? styles.disabledButton : undefined,
                ]}
              >
                <Text style={styles.buttonText}>
                  {confirmMutation.isPending ? (arabic ? "بنأكد…" : "Confirming...") : (arabic ? "أكّد التقرير" : "Confirm Scan")}
                </Text>
              </Pressable>
              {confirmMutation.isError ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {arabic ? "ما قدرناش نأكد التقرير. جرّب تاني." : reviewErrorMessage(confirmMutation.error, "The scan could not be confirmed. Please retry.")}
                </Text>
              ) : null}
            </>
          ) : data && !isLoading && !isError ? (
            <View style={styles.failedState}>
              <Text style={styles.stateText}>{arabic ? "التقرير لسه بيتعالج. جرّب تحمّله تاني بعد لحظة." : "This scan is still being processed. Try loading it again in a moment."}</Text>
              <AppButton label={arabic ? "حدّث التقرير" : "Refresh scan"} variant="secondary" onPress={() => void refetch()} />
            </View>
          ) : null}
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
  stateText: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 22,
  },
  editRow: {
    gap: spacing.sm,
  },
  failedState: {
    gap: spacing.md,
  },
  confirmedState: {
    gap: spacing.sm,
  },
  confirmedTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 20,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  inputArabic: { textAlign: "right", writingDirection: "rtl" },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.bronzeBorder,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 50,
  },
  secondaryButtonText: {
    color: colors.bronze,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 50,
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    color: colors.canvas,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
});

function reviewErrorMessage(error: Error | null, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function buildEditedMeasurements(
  measurements: InBodyMeasurement[],
  draftValues: Record<string, string>,
): InBodyMeasurement[] {
  return measurements.map((measurement) => {
    const draft = draftValues[measurement.key];
    if (draft === undefined) {
      return measurement;
    }
    return {
      ...measurement,
      value: draft.trim() ? Number(draft) : null,
      metadata: { ...measurement.metadata, user_edited: true },
    };
  });
}
