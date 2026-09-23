import { ApiError, parseApiErrorPayload } from "../../../core/api/errors";
import { getAccessToken } from "../../../core/auth/session";
import { apiRequest, getApiBaseUrl } from "../../../core/api/client";
import type { InBodyHistoryResponse, InBodyMeasurement, InBodyScan, UploadResponse } from "../types";
import { createUploadFile } from "./uploadFile";
import { uploadFetch } from "./uploadFetch";

export type LocalReportFile = {
  file?: Blob;
  uri: string;
  name: string;
  type: string;
};

export async function uploadInBodyReport(
  file: LocalReportFile | LocalReportFile[],
): Promise<UploadResponse> {
  const form = new FormData();
  const reports = Array.isArray(file) ? file : [file];
  for (const report of reports) {
    form.append("report", createUploadFile(report), report.name);
  }
  const headers = new Headers({ Accept: "application/json" });
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const endpoint = `${getApiBaseUrl()}/api/v1/inbody/scans`;
  const response = await uploadFetch(endpoint, {
    body: form,
    headers,
    method: "POST",
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => undefined)
      : undefined;
    const details = parseApiErrorPayload(payload);
    if (typeof __DEV__ !== "undefined" && __DEV__) console.info("[InBody] upload failed", { method: "POST", endpoint: "/api/v1/inbody/scans", status: response.status, errorCode: details.code });
    throw new ApiError(response.status, details.code, details.message);
  }
  const payload = (await response.json()) as UploadResponse;
  if (typeof __DEV__ !== "undefined" && __DEV__) console.info("[InBody] upload response", { method: "POST", endpoint: "/api/v1/inbody/scans", status: response.status, scanStatus: payload.scan.status, responseShape: Object.keys(payload).sort() });
  if (payload.scan.status === "failed") {
    throw new ApiError(response.status, payload.scan.failure_code ?? "ocr_provider_failed", payload.scan.failure_message ?? "The report could not be processed.");
  }
  return payload;
}

export function getInBodyHistory(): Promise<InBodyHistoryResponse> {
  return apiRequest<InBodyHistoryResponse>("/api/v1/inbody/scans");
}

export function getInBodyScan(scanId: string): Promise<InBodyScan> {
  return apiRequest<InBodyScan>(`/api/v1/inbody/scans/${scanId}`);
}

export function confirmInBodyScan(scanId: string): Promise<InBodyScan> {
  return apiRequest<InBodyScan>(`/api/v1/inbody/scans/${scanId}/confirm`, {
    method: "POST",
  });
}

export function updateInBodyReview(
  scanId: string,
  measurements: InBodyMeasurement[],
  scanDate: string | null,
): Promise<InBodyScan> {
  return apiRequest<InBodyScan>(`/api/v1/inbody/scans/${scanId}/review`, {
    body: {
      measurements,
      scan_date: scanDate,
    },
    method: "PATCH",
  });
}

export function deleteInBodyScan(scanId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/inbody/scans/${scanId}`, {
    method: "DELETE",
  });
}
