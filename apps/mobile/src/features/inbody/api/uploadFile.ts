import type { LocalReportFile } from "./inbodyApi";

export function createUploadFile(file: LocalReportFile): Blob {
  return file.file ?? (file as unknown as Blob);
}
