import { parseLocalizedNumber } from "../../../core/i18n/messages";
import {measurementUnit} from "../../../core/i18n/measurements";
import { phrase, phraseTemplate } from "../../../core/i18n/copy";
import { DirectionalText as Text, LanguageDirection } from "../../../core/components/DirectionalText";
import { router } from "expo-router";
import { AppButton } from "../../../core/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "../../../core/i18n/LocaleProvider";
import { useContext, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "../../../core/api/errors";
import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { confirmInBodyScan, getInBodyScan, updateInBodyReview } from "../api/inbodyApi";
import { MeasurementRow, measurementLabel } from "../components/MeasurementRow";
import { getInBodyReviewState, recoverableMeasurements } from "../reviewState";
import type { InBodyMeasurement } from "../types";

type Props = {
  scanId: string;
  onConfirmed?: () => void;
};

export function InBodyReviewScreen({ scanId, onConfirmed }: Props) {
  const arabic = useContext(LanguageDirection);
  const {t, locale} = useLocale(); const client = useQueryClient();
  const [manualRecovery, setManualRecovery] = useState(false);
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [draftDevice, setDraftDevice] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const { data, isError, isLoading, refetch } = useQuery({
    queryFn: () => getInBodyScan(scanId),
    queryKey: ["inbody", "scan", scanId],
  });
  const measurements = recoverableMeasurements(data?.result?.measurements ?? [], manualRecovery && data?.status === "failed");
  const reviewState = getInBodyReviewState(data);
  const canReview = Boolean(data && (reviewState === "review" || (reviewState === "failed" && manualRecovery)));
  const date = draftDate ?? data?.result?.scan_date ?? "";
  const device = draftDevice ?? data?.result?.device_label ?? "";
  const provenance = {device_label: device.trim() || null, expected_version: data?.result?.measurement_version ?? 1};

  const saveMutation = useMutation({
    mutationFn: () => updateInBodyReview(scanId, buildEditedMeasurements(measurements, draftValues), date || null, provenance),
    onSuccess: updated => {client.setQueryData(["inbody", "scan", scanId], updated); setDraftValues({}); setDraftDate(null); setDraftDevice(null);},
  });
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (canReview && (Object.keys(draftValues).length > 0 || draftDate !== null || draftDevice !== null || (manualRecovery && data?.status === "failed"))) {
        const updated = await updateInBodyReview(
          scanId,
          buildEditedMeasurements(measurements, draftValues),
          date || null,
          provenance,
        );
        client.setQueryData(["inbody", "scan", scanId], updated); setDraftValues({}); setDraftDate(null); setDraftDevice(null);
      }
      return confirmInBodyScan(scanId);
    },
    onSuccess: () => {for (const key of ["inbody", "avatars", "assessment", "game"]) void client.invalidateQueries({queryKey: [key]}); onConfirmed?.();},
  });

  function updateValue(key: string, value: string) {
    setDraftValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>
          {phrase("copy_20f16a768dae", arabic)}
        </Text>
        <Text style={styles.subtitle}>{phrase("copy_e7779428bb4f", arabic)}</Text>

        <SurfaceCard>
          {isLoading ? <Text style={styles.stateText}>{phrase("copy_75a2fa3e31fe", arabic)}</Text> : null}
          {isError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void refetch()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{phrase("copy_a1af7493c131", arabic)}</Text>
            </Pressable>
          ) : null}
          {reviewState === "failed" && !manualRecovery ? (
            <View style={styles.failedState}>
              <Text accessibilityRole="alert" style={styles.errorText}>
                {arabic ? "ما قدرناش نعالج التقرير ده." : data?.failure_message ?? "This report could not be processed."}
              </Text>
              <Text style={styles.subtitle}>
                {phrase("copy_78f26b868ea9", arabic)}
              </Text>
              <AppButton label={t("manualReportReview")} variant="green" onPress={() => setManualRecovery(true)}/>
              <AppButton label={phrase("copy_6c2a53bb6a8c", arabic)} onPress={() => router.replace("/inbody")} />
              <AppButton label={phrase("copy_8986b24d8720", arabic)} variant="secondary" onPress={() => router.replace("/profile")} />
            </View>
          ) : reviewState === "confirmed" ? (
            <View style={styles.confirmedState}>
              <Text style={styles.confirmedTitle}>{phrase("copy_844f9c0ef373", arabic)}</Text>
              <Text style={styles.stateText}>
                {phrase("copy_4ded223ac59b", arabic)}
              </Text>
              <Pressable accessibilityRole="button" onPress={onConfirmed} style={styles.button}>
                <Text style={styles.buttonText}>{phrase("copy_ec60f955dfd5", arabic)}</Text>
              </Pressable>
            </View>
          ) : canReview ? (
            <>
              {manualRecovery ? <Text style={styles.subtitle}>{t("manualReportHelp")}</Text> : null}
              <Text style={styles.subtitle}>{t("measurementDate")}</Text>
              <TextInput accessibilityLabel={t("measurementDate")} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} autoCapitalize="none" style={[styles.input, {minHeight: 50, writingDirection: "ltr"}]} value={date} onChangeText={setDraftDate}/>
              <Text style={styles.subtitle}>{t("dateInputHelp")}</Text>
              <Text style={styles.subtitle}>{t("measurementDevice")}</Text>
              <TextInput accessibilityLabel={t("measurementDevice")} placeholder="InBody" placeholderTextColor={colors.muted} maxLength={120} style={[styles.input, {minHeight: 50}, arabic && styles.inputArabic]} value={device} onChangeText={setDraftDevice}/>
              {measurements.map((measurement) => (
                <View key={measurement.key} style={styles.editRow}>
                  <MeasurementRow measurement={measurement} />
                  <TextInput
                    accessibilityLabel={phraseTemplate("copy_43276d5b2c84", arabic, [measurementLabel(measurement.key, arabic)]) + (measurement.unit ? " (" + measurementUnit(measurement.unit, locale) + ")" : "")}
                    keyboardType="decimal-pad"
                    onChangeText={(value) => updateValue(measurement.key, value)}
                    placeholder={phrase("copy_53cdbd5e3c85", arabic) + (measurement.unit ? " · " + measurementUnit(measurement.unit, locale) : "")}
                    placeholderTextColor={colors.muted}
                    style={[styles.input, arabic && styles.inputArabic]}
                    value={draftValues[measurement.key] ?? (measurement.value === null ? "" : String(measurement.value))}
                  />
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                disabled={!canReview || saveMutation.isPending || confirmMutation.isPending}
                onPress={() => saveMutation.mutate()}
                style={[styles.secondaryButton, !canReview ? styles.disabledButton : undefined]}
              >
                <Text style={styles.secondaryButtonText}>
                  {saveMutation.isPending ? (phrase("copy_fdb50efd5953", arabic)) : (phrase("copy_828a42113e4f", arabic))}
                </Text>
              </Pressable>
              {saveMutation.isError ? (
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {arabic ? "ما قدرناش نحفظ التعديلات. جرّب تاني." : reviewErrorMessage(saveMutation.error, "Corrections could not be saved. Please retry.")}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={!canReview || confirmMutation.isPending || saveMutation.isPending}
                onPress={() => confirmMutation.mutate()}
                style={[
                  styles.button,
                  !canReview || saveMutation.isPending ? styles.disabledButton : undefined,
                ]}
              >
                <Text style={styles.buttonText}>
                  {confirmMutation.isPending ? (phrase("copy_fcc0bf81fd5b", arabic)) : (phrase("copy_2bf426da5cc4", arabic))}
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
              <Text style={styles.stateText}>{phrase("copy_2645a252bba5", arabic)}</Text>
              <AppButton label={phrase("copy_38de786493db", arabic)} variant="secondary" onPress={() => void refetch()} />
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
      value: draft.trim() ? parseLocalizedNumber(draft) : null,
      metadata: { ...measurement.metadata, user_edited: true },
    };
  });
}
