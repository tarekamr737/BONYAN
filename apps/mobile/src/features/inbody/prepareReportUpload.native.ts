import { File } from "expo-file-system";
import { printToFileAsync } from "expo-print";

import type { LocalReportFile } from "./api/inbodyApi";
import type { PreparedReportUpload } from "./prepareReportUpload";

const MAX_REPORT_PAGES = 3;

function imagePage(dataUri: string): string {
  return `<section class="page"><img alt="InBody report page" src="${dataUri}" /></section>`;
}

export async function prepareReportUpload(files: LocalReportFile[]): Promise<PreparedReportUpload> {
  if (files.length === 0 || files.length > MAX_REPORT_PAGES) {
    throw new Error("Choose between one and three report images.");
  }
  if (files.length === 1) {
    return { cleanup: async () => undefined, report: files[0]! };
  }
  if (files.some((file) => !file.type.startsWith("image/"))) {
    throw new Error("Choose one PDF, or up to three images of the same report.");
  }

  const pages = await Promise.all(files.map(async (file) => {
    const base64 = await new File(file.uri).base64();
    return imagePage(`data:${file.type};base64,${base64}`);
  }));
  const html = `<!DOCTYPE html>
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page { margin: 0; size: 612px 792px; }
      html, body { margin: 0; padding: 0; }
      .page { align-items: center; display: flex; height: 792px; justify-content: center; page-break-after: always; width: 612px; }
      .page:last-child { page-break-after: auto; }
      img { display: block; max-height: 100%; max-width: 100%; object-fit: contain; }
    </style></head><body>${pages.join("")}</body></html>`;
  const result = await printToFileAsync({
    height: 792,
    html,
    margins: { bottom: 0, left: 0, right: 0, top: 0 },
    width: 612,
  });
  const generated = new File(result.uri);

  return {
    cleanup: async () => {
      if (generated.exists) generated.delete();
    },
    report: {
      name: `inbody-${files.length}-pages.pdf`,
      type: "application/pdf",
      uri: result.uri,
    },
  };
}
