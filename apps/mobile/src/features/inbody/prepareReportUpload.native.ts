import { File, Paths } from "expo-file-system";

import type { LocalReportFile } from "./api/inbodyApi";
import type { PreparedReportUpload } from "./prepareReportUpload";

const MAX_REPORT_PAGES = 3;

async function materializeReportFile(file: LocalReportFile, index: number): Promise<LocalReportFile> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const cached = new File(
    Paths.cache,
    `inbody-page-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}-${safeName}`,
  );
  const bytes = file.file
    ? new Uint8Array(await file.file.arrayBuffer())
    : await new File(file.uri).bytes();
  cached.create({ overwrite: true });
  cached.write(bytes);
  return { ...file, file: cached, uri: cached.uri };
}

export async function prepareReportUpload(files: LocalReportFile[]): Promise<PreparedReportUpload> {
  if (files.length === 0 || files.length > MAX_REPORT_PAGES) {
    throw new Error("Choose between one and three report images.");
  }
  if (files.length > 1 && files.some((file) => !file.type.startsWith("image/"))) {
    throw new Error("Choose one PDF, or up to three images of the same report.");
  }
  const materialized = await Promise.all(files.map(materializeReportFile));

  return {
    cleanup: async () => {
      for (const report of materialized) {
        const cached = new File(report.uri);
        if (cached.exists) cached.delete();
      }
    },
    report: materialized.length === 1 ? materialized[0]! : materialized,
  };
}
