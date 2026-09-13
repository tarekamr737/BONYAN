import { useMutation } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SurfaceCard } from "../../../core/components/SurfaceCard";
import { colors, fonts, radii, spacing } from "../../../core/theme/tokens";
import { uploadInBodyReport, type LocalReportFile } from "../api/inbodyApi";
import { prepareReportUpload } from "../prepareReportUpload";
import type { UploadResponse } from "../types";
import { getUploadErrorMessage } from "../uploadError";

type Props = {
  selectedFiles: LocalReportFile[];
  onPickFile?: () => void;
  onUploaded?: (response: UploadResponse) => void;
};

export function InBodyUploadScreen({ selectedFiles, onPickFile, onUploaded }: Props) {
  const uploadMutation = useMutation({
    mutationFn: async (files: LocalReportFile[]) => {
      const prepared = await prepareReportUpload(files);
      try {
        return await uploadInBodyReport(prepared.report);
      } finally {
        await prepared.cleanup();
      }
    },
    onSuccess: onUploaded,
  });
  const pageCount = selectedFiles.length;
  const hasSelection = pageCount > 0;
  const selectionTitle = pageCount > 1
    ? `${pageCount} report pages selected`
    : selectedFiles[0]?.name ?? "Choose an InBody report";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          InBody OCR
        </Text>
        <Text style={styles.subtitle}>Upload a report image or PDF for private extraction and review.</Text>

        <SurfaceCard>
          <View style={styles.dropZone}>
            <Text style={styles.dropTitle}>{selectionTitle}</Text>
            {pageCount > 1 ? (
              <View style={styles.fileList}>
                {selectedFiles.map((file, index) => (
                  <Text key={`${file.uri}-${index}`} numberOfLines={1} style={styles.fileName}>
                    {`${index + 1}. ${file.name}`}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.dropCopy}>Choose one PDF or up to three images of the same report.</Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                uploadMutation.reset();
                onPickFile?.();
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>{hasSelection ? "Change Pages" : "Choose Pages"}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!hasSelection || uploadMutation.isPending}
              onPress={() => hasSelection && uploadMutation.mutate(selectedFiles)}
              style={[styles.primaryButton, !hasSelection ? styles.disabledButton : undefined]}
            >
              <Text style={styles.primaryText}>
                {uploadMutation.isPending ? "Processing..." : pageCount > 1 ? `Upload ${pageCount} Pages` : "Upload"}
              </Text>
            </Pressable>
          </View>
          {uploadMutation.isError ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {getUploadErrorMessage(uploadMutation.error)}
            </Text>
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
  fileList: {
    alignSelf: "stretch",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  fileName: {
    color: colors.mutedLight,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "left",
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
