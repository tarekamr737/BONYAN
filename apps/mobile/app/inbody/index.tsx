import { phrase } from "../../src/core/i18n/copy";
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
        phrase("copy_e1ce3d3077ab", arabic),
        phrase("copy_c895bd0c8d0a", arabic),
      );
      return;
    }
    const pdfs = files.filter((file) => file.type === "application/pdf");
    if (pdfs.length > 0 && files.length > 1) {
      Alert.alert(
        phrase("copy_7cfa9b91eeec", arabic),
        phrase("copy_e544bc5a6960", arabic),
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
        phrase("copy_4824086162b8", arabic),
        phrase("copy_f98b0b1d841d", arabic),
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
          title: phrase("copy_472e8714b248", arabic),
        },
        (buttonIndex) => {
          if (buttonIndex === 0) void pickFromGallery();
          if (buttonIndex === 1) void takePhoto();
          if (buttonIndex === 2) void pickFromFiles();
        },
      );
      return;
    }

    Alert.alert(phrase("copy_472e8714b248", arabic), phrase("copy_35a5c607dbfe", arabic), [
      { text: phrase("copy_af2db264a698", arabic), onPress: () => void pickFromGallery() },
      { text: phrase("copy_a4191117a6e8", arabic), onPress: () => void takePhoto() },
      { text: phrase("copy_bd6002495741", arabic), onPress: () => void pickFromFiles() },
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
