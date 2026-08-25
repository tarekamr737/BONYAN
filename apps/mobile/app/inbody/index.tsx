import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useState } from "react";

import { InBodyUploadScreen } from "../../src/features/inbody";
import type { LocalReportFile } from "../../src/features/inbody/api/inbodyApi";

export default function InBodyUploadRoute() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<LocalReportFile>();

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    });
    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      setSelectedFile({
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "application/octet-stream",
      });
    }
  }

  return (
    <InBodyUploadScreen
      onPickFile={() => void pickFile()}
      onUploaded={(scanId) =>
        router.replace({ pathname: "./review", params: { scanId } })
      }
      selectedFile={selectedFile}
    />
  );
}
