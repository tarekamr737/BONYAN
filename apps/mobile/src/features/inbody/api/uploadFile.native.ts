import { File } from "expo-file-system";

import type { LocalReportFile } from "./inbodyApi";

export function createUploadFile(file: LocalReportFile): Blob {
  return new File(file.uri);
}
