import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import { InBodyUploadScreen } from "../../src/features/inbody";
import type { LocalReportFile } from "../../src/features/inbody/api/inbodyApi";
import { getInBodyUploadDestination } from "../../src/features/inbody/uploadDestination";

export default function InBodyUploadRoute() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<LocalReportFile[]>([]);

  function selectFiles(files: LocalReportFile[]) {
    setSelectedFiles(files);
  }

  function selectDocumentAssets(assets: DocumentPicker.DocumentPickerAsset[]) {
    if (assets.length > 3) {
      Alert.alert("Choose up to 3 images", "Select no more than three report pages.");
      return;
    }
    const files = assets.map((file) => ({
      file: file.file,
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream",
    }));
    const pdfs = files.filter((file) => file.type === "application/pdf");
    if (pdfs.length > 0 && files.length > 1) {
      Alert.alert(
        "Choose one PDF or images",
        "A PDF already contains its pages. Select one PDF, or up to three images.",
      );
      return;
    }
    selectFiles(files);
  }

  async function pickFromFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    });
    if (!result.canceled && result.assets.length > 0) {
      selectDocumentAssets(result.assets);
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
        "Camera permission needed",
        "Allow BONYAN to use the camera, then try again.",
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
          options: ["Photo Library", "Camera", "Files", "Cancel"],
          title: "Choose an InBody report",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) void pickFromGallery();
          if (buttonIndex === 1) void takePhoto();
          if (buttonIndex === 2) void pickFromFiles();
        },
      );
      return;
    }

    Alert.alert("Choose an InBody report", "Select where to get the report.", [
      { text: "Photo Library", onPress: () => void pickFromGallery() },
      { text: "Camera", onPress: () => void takePhoto() },
      { text: "Files", onPress: () => void pickFromFiles() },
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
