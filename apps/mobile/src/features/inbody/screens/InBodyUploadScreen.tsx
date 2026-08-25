import { useMutation } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { uploadInBodyReport, type LocalReportFile } from "../api/inbodyApi";

type Props = {
  selectedFile?: LocalReportFile;
  onPickFile?: () => void;
  onUploaded?: (scanId: string) => void;
};

export function InBodyUploadScreen({ selectedFile, onPickFile, onUploaded }: Props) {
  const uploadMutation = useMutation({
    mutationFn: uploadInBodyReport,
    onSuccess: (response) => onUploaded?.(response.scan.id),
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          InBody OCR
        </Text>
        <Text style={styles.subtitle}>Upload a report image or PDF for private extraction and review.</Text>

        <SurfaceCard>
          <View style={styles.dropZone}>
            <Text style={styles.dropTitle}>{selectedFile?.name ?? "Choose an InBody report"}</Text>
            <Text style={styles.dropCopy}>Images, native PDFs, and scanned PDFs are supported.</Text>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onPickFile} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Choose File</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!selectedFile || uploadMutation.isPending}
              onPress={() => selectedFile && uploadMutation.mutate(selectedFile)}
              style={[styles.primaryButton, !selectedFile ? styles.disabledButton : undefined]}
            >
              <Text style={styles.primaryText}>{uploadMutation.isPending ? "Processing..." : "Upload"}</Text>
            </Pressable>
          </View>
          {uploadMutation.isError ? (
            <Text style={styles.errorText}>The report could not be uploaded. Check the file and retry.</Text>
          ) : null}
        </SurfaceCard>
      </View>
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
    fontSize: 40,
    lineHeight: 45,
  },
  subtitle: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  dropZone: {
    alignItems: "center",
    borderColor: colors.bronzeBorder,
    borderRadius: radii.control,
    borderStyle: "dashed",
    borderWidth: 1,
    minHeight: 170,
    justifyContent: "center",
    padding: spacing.lg,
  },
  dropTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },
  dropCopy: {
    color: colors.mutedLight,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.bronze,
    borderRadius: radii.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryText: {
    color: colors.canvas,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  secondaryText: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.md,
  },
});
