import type { LocalReportFile } from "./api/inbodyApi";

export type PreparedReportUpload = {
  cleanup: () => Promise<void>;
  report: LocalReportFile;
};

export async function prepareReportUpload(files: LocalReportFile[]): Promise<PreparedReportUpload> {
  if (files.length !== 1) {
    throw new Error("Multi-page image uploads are available in the BONYAN mobile app.");
  }
  return { cleanup: async () => undefined, report: files[0]! };
}
