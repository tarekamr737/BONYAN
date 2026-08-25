import { apiRequest } from "../../../core/api/client";
import type { InBodyHistoryResponse, InBodyMeasurement, InBodyScan, UploadResponse } from "../types";

const defaultBaseUrl = "http://127.0.0.1:8000";

function getBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? defaultBaseUrl).replace(/\/+$/, "");
}

export type LocalReportFile = {
  uri: string;
  name: string;
  type: string;
};

export async function uploadInBodyReport(file: LocalReportFile): Promise<UploadResponse> {
  const form = new FormData();
  form.append("report", file as unknown as Blob);

  const response = await fetch(`${getBaseUrl()}/api/v1/inbody/scans`, {
    body: form,
    headers: {
      Accept: "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }
  return (await response.json()) as UploadResponse;
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
