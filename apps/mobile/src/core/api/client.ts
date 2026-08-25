import { ApiError, parseApiErrorPayload } from "./errors";
import { getAccessToken } from "../auth/session";

const defaultBaseUrl = "http://127.0.0.1:8000";

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function getBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? defaultBaseUrl).replace(/\/+$/, "");
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

async function readPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }

  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const accessToken = getAccessToken();
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${getBaseUrl()}${normalizePath(path)}`, {
    ...options,
    body,
    headers,
  });

  if (!response.ok) {
    const details = parseApiErrorPayload(await readPayload(response));
    throw new ApiError(response.status, details.code, details.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
