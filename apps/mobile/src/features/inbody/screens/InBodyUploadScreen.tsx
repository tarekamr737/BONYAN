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
    <AppButton label={arabic ? "رجوع" : "Back"} variant="secondary" disabled={uploadMutation.isPending} onPress={() => router.canGoBack() ? router.back() : router.replace("/profile")} />
    <View style={{gap: 10}}><Text accessibilityRole="header" style={[ui.title, arabic && ui.rtl]}>{arabic ? "تقريرك، نقطة بداية أوضح" : "Your report. A clearer starting point."}</Text><Text style={[ui.text, arabic && ui.rtl]}>{arabic ? "ارفع التقرير، راجع القياسات، وأكّد القيم الصحيحة قبل استخدامها." : "Upload your report, review the measurements, then confirm the values before using them."}</Text></View>
    <GlassCard>
      <View style={{alignItems: "center", paddingVertical: 18, gap: 16}}><Feather name={hasSelection ? "file-text" : "upload-cloud"} size={36} color={colors.bronze} />
        <Text style={[ui.heading, {textAlign: "center"}]}>{hasSelection ? arabic ? `${selectedFiles.length} ملف جاهز للرفع` : `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} ready` : arabic ? "اختار تقرير InBody" : "Choose your InBody report"}</Text>
        <Text style={[ui.text, {textAlign: "center"}]}>{arabic ? "ملف PDF واحد أو حتى ٣ صور واضحة لنفس التقرير." : "One PDF or up to three clear images of the same report."}</Text>
      </View>
      {selectedFiles.map((file, index) => <View key={`${file.uri}-${index}`} style={ui.row}><Feather name="file" size={18} color={colors.muted} /><Text numberOfLines={2} style={[ui.small, {flex: 1}]}>{file.name}</Text></View>)}
      <AppButton label={hasSelection ? arabic ? "تغيير الملفات" : "Change files" : arabic ? "اختيار التقرير" : "Choose report"} variant="secondary" disabled={uploadMutation.isPending} onPress={() => {uploadMutation.reset(); onPickFile?.();}} />
      <AppButton label={arabic ? "رفع ومراجعة القياسات" : "Upload & review measurements"} disabled={!hasSelection} loading={uploadMutation.isPending} onPress={() => uploadMutation.mutate(selectedFiles)} />
      {uploadMutation.isPending ? <Text accessibilityLiveRegion="polite" style={ui.small}>{arabic ? "بنقرأ التقرير. العملية ممكن تاخد لحظات؛ استنى النتيجة هنا." : "Reading your report. This may take a moment; stay here for the result."}</Text> : null}
      {uploadMutation.isError ? <Text accessibilityRole="alert" style={ui.error}>{getUploadErrorMessage(uploadMutation.error, arabic)}</Text> : null}
    </GlassCard>
    <View style={ui.row}><Feather name="lock" size={17} color={colors.muted} /><Text style={[ui.small, {flex: 1}, arabic && ui.rtl]}>{arabic ? "تقريرك خاص. راجع القيم المستخرجة قبل التأكيد." : "Your report stays private. Review extracted values before confirming."}</Text></View>
    <AppButton label={arabic ? "أفضل إدخال القياسات يدويًا" : "I'd rather enter measurements manually"} variant="secondary" disabled={uploadMutation.isPending} onPress={() => router.replace(profile.data?.onboarding_completed ? "/profile" : "/onboarding")} />
  </CoachingPage>;
}
