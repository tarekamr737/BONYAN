import { ApiError, parseApiErrorPayload } from "./errors";
import { clearSession, getAccessToken } from "../auth/session";

const defaultBaseUrl = "http://127.0.0.1:8000";

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
};

export function getApiBaseUrl(): string {
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

  const { timeoutMs = 90_000, signal, ...requestOptions } = options;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
  const response = await fetch(`${getApiBaseUrl()}${normalizePath(path)}`, {
    ...requestOptions, body, headers, signal: controller.signal,
  });

  if (!response.ok) {
    const details = parseApiErrorPayload(await readPayload(response));
    if (response.status === 401 && accessToken && getAccessToken() === accessToken) {
      void clearSession();
    }
    throw new ApiError(response.status, details.code, details.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
  } catch (error) {
    if (timedOut) throw new ApiError(408, "request_timeout", "The request took too long. Check your connection and try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
