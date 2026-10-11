import { phrase } from "../../../core/i18n/copy";
import { DirectionalText as Text } from "../../../core/components/DirectionalText";
import { useMutation, useQuery } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { View } from "react-native";
import { AppButton } from "../../../core/components";
import { colors } from "../../../core/theme/tokens";
import { getMyProfile } from "../../auth/api/profileApi";
import { CoachingPage, GlassCard, ui } from "../../auth/components/CoachingUI";
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
  const profile = useQuery({queryKey: ["profile", "me"], queryFn: getMyProfile});
  const arabic = profile.data?.preferred_language.startsWith("ar") ?? false;
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
  const hasSelection = selectedFiles.length > 0;
  return <CoachingPage arabic={arabic}>
    <AppButton label={phrase("copy_436170a81a03", arabic)} variant="secondary" disabled={uploadMutation.isPending} onPress={() => router.canGoBack() ? router.back() : router.replace("/profile")} />
    <View style={{gap: 10}}><Text accessibilityRole="header" style={[ui.title, arabic && ui.rtl]}>{phrase("copy_abeee53303ff", arabic)}</Text><Text style={[ui.text, arabic && ui.rtl]}>{phrase("copy_e1b5ee68924a", arabic)}</Text></View>
    <GlassCard>
      <View style={{alignItems: "center", paddingVertical: 18, gap: 16}}><Feather name={hasSelection ? "file-text" : "upload-cloud"} size={36} color={colors.bronze} />
        <Text style={[ui.heading, {textAlign: "center"}]}>{hasSelection ? arabic ? `${selectedFiles.length} ملف جاهز للرفع` : `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} ready` : phrase("copy_7b94ba469de9", arabic)}</Text>
        <Text style={[ui.text, {textAlign: "center"}]}>{phrase("copy_bb32f9d9622a", arabic)}</Text>
      </View>
      {selectedFiles.map((file, index) => <View key={`${file.uri}-${index}`} style={ui.row}><Feather name="file" size={18} color={colors.muted} /><Text numberOfLines={2} style={[ui.small, {flex: 1}]}>{file.name}</Text></View>)}
      <AppButton label={hasSelection ? phrase("copy_b0d03fb20005", arabic) : phrase("copy_516dc1082c5c", arabic)} variant="secondary" disabled={uploadMutation.isPending} onPress={() => {uploadMutation.reset(); onPickFile?.();}} />
      <AppButton label={phrase("copy_7ec2aa7a5c6e", arabic)} disabled={!hasSelection} loading={uploadMutation.isPending} onPress={() => uploadMutation.mutate(selectedFiles)} />
      {uploadMutation.isPending ? <Text accessibilityLiveRegion="polite" style={ui.small}>{phrase("copy_24db52b136f0", arabic)}</Text> : null}
      {uploadMutation.isError ? <Text accessibilityRole="alert" style={ui.error}>{getUploadErrorMessage(uploadMutation.error, arabic)}</Text> : null}
    </GlassCard>
    <View style={ui.row}><Feather name="lock" size={17} color={colors.muted} /><Text style={[ui.small, {flex: 1}, arabic && ui.rtl]}>{phrase("copy_c74375aeb543", arabic)}</Text></View>
    <AppButton label={phrase("copy_86585fb3956a", arabic)} variant="secondary" disabled={uploadMutation.isPending} onPress={() => router.replace(profile.data?.onboarding_completed ? "/profile" : "/onboarding")} />
  </CoachingPage>;
}
