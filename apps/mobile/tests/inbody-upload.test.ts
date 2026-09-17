import { afterEach, describe, expect, it, vi } from "vitest";

import { setSessionAccessToken } from "../src/core/auth/session";
import { uploadInBodyReport } from "../src/features/inbody/api/inbodyApi";
import { prepareReportUpload } from "../src/features/inbody/prepareReportUpload";
import { getUploadErrorMessage } from "../src/features/inbody/uploadError";
import { getInBodyUploadDestination } from "../src/features/inbody/uploadDestination";

afterEach(() => {
  setSessionAccessToken(null);
  vi.unstubAllGlobals();
});

describe("InBody upload feedback", () => {
  it("preserves a safe API error message", () => {
    expect(getUploadErrorMessage(new Error("Upload a readable InBody image or PDF."))).toBe(
      "Upload a readable InBody image or PDF.",
    );
  });

  it("explains a network failure", () => {
    expect(getUploadErrorMessage(new TypeError("Network request failed"))).toBe(
      "BONYAN could not reach the server. Check your connection and retry.",
    );
  });

  it("explains when Android file access has expired", () => {
    const error = new Error("Missing READ permission for selected file");
    expect(getUploadErrorMessage(error)).toBe(
      "BONYAN could not read one or more files. Select the pages again and retry.",
    );
    expect(getUploadErrorMessage(error, true)).toBe(
      "ما قدرناش نقرا ملف أو أكتر. اختار الصفحات من جديد وحاول تاني.",
    );
  });

  it("uploads a real Blob with the trusted bearer token", async () => {
    setSessionAccessToken("signed-access-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          duplicate: false,
          scan: { id: "scan-1", status: "review_required" },
        }),
        { headers: { "Content-Type": "application/json" }, status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await uploadInBodyReport({
      file: new Blob(["report"], { type: "application/pdf" }),
      name: "report.pdf",
      type: "application/pdf",
      uri: "file:///report.pdf",
    });

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/inbody/scans");
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer signed-access-token");
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get("report")).toBeInstanceOf(Blob);
  });

  it("uploads each page under the same private report field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ duplicate: false, scan: { id: "scan-pages", status: "review_required" } }),
        { headers: { "Content-Type": "application/json" }, status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const pages = [1, 2, 3].map((page) => ({
      file: new Blob([`page-${page}`], { type: "image/jpeg" }),
      name: `page-${page}.jpg`,
      type: "image/jpeg",
      uri: `file:///page-${page}.jpg`,
    }));

    await uploadInBodyReport(pages);

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((options.body as FormData).getAll("report")).toHaveLength(3);
  });

  it("keeps a single report unchanged", async () => {
    const report = {
      file: new Blob(["report"], { type: "application/pdf" }),
      name: "report.pdf",
      type: "application/pdf",
      uri: "file:///report.pdf",
    };

    const prepared = await prepareReportUpload([report]);

    expect(prepared.report).toBe(report);
  });

  it("does not pretend web can prepare a native multi-page report", async () => {
    const page = { name: "page.jpg", type: "image/jpeg", uri: "file:///page.jpg" };
    await expect(prepareReportUpload([page, page])).rejects.toThrow(
      "Multi-page image uploads are available in the BONYAN mobile app.",
    );
  });

  it("sends an already-confirmed duplicate directly to progress", () => {
    const destination = getInBodyUploadDestination({
      duplicate: true,
      scan: {
        confirmed_at: "2026-09-13T18:01:37Z",
        content_type: "application/pdf",
        created_at: "2026-09-13T18:01:34Z",
        failure_code: null,
        failure_message: null,
        filename: "report.pdf",
        id: "scan-1",
        result: null,
        status: "confirmed",
        updated_at: "2026-09-13T18:01:37Z",
      },
    });

    expect(destination).toEqual({ route: "progress" });
  });
});
