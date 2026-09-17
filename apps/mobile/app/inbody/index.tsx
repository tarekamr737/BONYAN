import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import { LanguageDirection } from "../../src/core/components/DirectionalText";
import { InBodyUploadScreen } from "../../src/features/inbody";
import type { LocalReportFile } from "../../src/features/inbody/api/inbodyApi";
import { getInBodyUploadDestination } from "../../src/features/inbody/uploadDestination";

export default function InBodyUploadRoute() {
  const router = useRouter();
  const arabic = useContext(LanguageDirection);
  const [selectedFiles, setSelectedFiles] = useState<LocalReportFile[]>([]);

  function selectFiles(files: LocalReportFile[]) {
    setSelectedFiles(files);
  }

  function selectDocumentFiles(files: LocalReportFile[]) {
    if (files.length > 3) {
      Alert.alert(
        arabic ? "اختار لحد ٣ صور" : "Choose up to 3 images",
        arabic ? "اختار بحد أقصى ٣ صفحات من نفس التقرير." : "Select no more than three report pages.",
      );
      return;
    }
    const pdfs = files.filter((file) => file.type === "application/pdf");
    if (pdfs.length > 0 && files.length > 1) {
      Alert.alert(
        arabic ? "اختار PDF واحد أو صور" : "Choose one PDF or images",
        arabic ? "ملف PDF فيه صفحاته بالفعل. اختار PDF واحد، أو لحد ٣ صور." : "A PDF already contains its pages. Select one PDF, or up to three images.",
      );
      return;
    }
    selectFiles(files);
  }

  async function pickFromFiles() {
    if (Platform.OS === "android") {
      const result = await ExpoFile.pickFileAsync({
        mimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        multipleFiles: true,
      });
      if (!result.canceled) {
        selectDocumentFiles(result.result.map((file, index) => {
          const type = file.type || (file.extension.toLowerCase() === ".pdf" ? "application/pdf" : "application/octet-stream");
          const extension = ({
            "application/pdf": ".pdf",
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
          } as Record<string, string>)[type] ?? file.extension;
          const name = file.name.includes(".") ? file.name : `inbody-report-${index + 1}${extension}`;
          return { file, name, type, uri: file.uri };
        }));
      }
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    });
    if (!result.canceled && result.assets.length > 0) {
      selectDocumentFiles(result.assets.map((file) => ({
        file: file.file,
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "application/octet-stream",
      })));
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      orderedSelection: true,
      quality: 1,
      selectionLimit: 3,
    });
    if (!result.canceled && result.assets.length > 0) {
      selectFiles(result.assets.map((image, index) => ({
        file: image.file,
        name: image.fileName ?? `inbody-page-${index + 1}.${image.mimeType?.split("/")[1] ?? "jpg"}`,
        type: image.mimeType ?? "image/jpeg",
        uri: image.uri,
      })));
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        arabic ? "محتاجين إذن الكاميرا" : "Camera permission needed",
        arabic ? "اسمح لبنيان باستخدام الكاميرا وبعدين جرّب تاني." : "Allow BONYAN to use the camera, then try again.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.back,
      mediaTypes: ["images"],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const image = result.assets[0];
      const nextFile: LocalReportFile = {
        file: image.file,
        name: image.fileName ?? `inbody-camera-${selectedFiles.length + 1}.jpg`,
        type: image.mimeType ?? "image/jpeg",
        uri: image.uri,
      };
      const canAppend = selectedFiles.length < 3 && selectedFiles.every((file) => file.type.startsWith("image/"));
      selectFiles(canAppend ? [...selectedFiles, nextFile] : [nextFile]);
    }
  }

  function chooseReportSource() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex: 3,
          options: arabic ? ["مكتبة الصور", "الكاميرا", "الملفات", "إلغاء"] : ["Photo Library", "Camera", "Files", "Cancel"],
          title: arabic ? "اختار تقرير InBody" : "Choose an InBody report",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) void pickFromGallery();
          if (buttonIndex === 1) void takePhoto();
          if (buttonIndex === 2) void pickFromFiles();
        },
      );
      return;
    }

    Alert.alert(arabic ? "اختار تقرير InBody" : "Choose an InBody report", arabic ? "اختار مصدر التقرير." : "Select where to get the report.", [
      { text: arabic ? "مكتبة الصور" : "Photo Library", onPress: () => void pickFromGallery() },
      { text: arabic ? "الكاميرا" : "Camera", onPress: () => void takePhoto() },
      { text: arabic ? "الملفات" : "Files", onPress: () => void pickFromFiles() },
    ], { cancelable: true });
  }

  return (
    <InBodyUploadScreen
      onPickFile={chooseReportSource}
      onUploaded={(response) => {
        const destination = getInBodyUploadDestination(response);
        if (destination.route === "progress") {
          router.replace("/inbody/progress");
          return;
        }
        router.replace({ pathname: "/inbody/review", params: { scanId: destination.scanId } });
      }}
      selectedFiles={selectedFiles}
    />
  );
}
