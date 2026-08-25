import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { confirmInBodyScan, getInBodyScan, updateInBodyReview } from "../api/inbodyApi";
import { MeasurementRow } from "../components/MeasurementRow";
import type { InBodyMeasurement } from "../types";

export function InBodyReviewScreen({ scanId }: { scanId: string }) {
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({
    queryFn: () => getInBodyScan(scanId),
    queryKey: ["inbody", "scan", scanId],
  });
  const measurements = data?.result?.measurements ?? [];

  const saveMutation = useMutation({
    mutationFn: () => updateInBodyReview(scanId, buildEditedMeasurements(measurements, draftValues), data?.result?.scan_date ?? null),
  });
  const confirmMutation = useMutation({
    mutationFn: () => confirmInBodyScan(scanId),
  });

  function updateValue(key: string, value: string) {
    setDraftValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>
          Review Scan
        </Text>
        <Text style={styles.subtitle}>Confirm only values that match your report.</Text>

        <SurfaceCard>
          {isLoading ? <Text style={styles.stateText}>Reading scan...</Text> : null}
          {data?.failure_message ? <Text style={styles.errorText}>{data.failure_message}</Text> : null}
          {measurements.map((measurement) => (
            <View key={measurement.key} style={styles.editRow}>
              <MeasurementRow measurement={measurement} />
              <TextInput
                accessibilityLabel={`Correct ${measurement.key}`}
                keyboardType="decimal-pad"
                onChangeText={(value) => updateValue(measurement.key, value)}
                placeholder="Value"
                placeholderTextColor={colors.muted}
                style={styles.input}
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
              {saveMutation.isPending ? "Saving..." : "Save Corrections"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!data?.result || confirmMutation.isPending}
            onPress={() => confirmMutation.mutate()}
            style={[styles.button, !data?.result ? styles.disabledButton : undefined]}
          >
            <Text style={styles.buttonText}>
              {confirmMutation.isPending ? "Confirming..." : "Confirm Scan"}
            </Text>
          </Pressable>
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
