export const fallbackApiError = {
  code: "request_failed",
  message: "Something went wrong. Please try again.",
} as const;

export type ApiErrorDetails = {
  code: string;
  message: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseApiErrorPayload(payload: unknown): ApiErrorDetails {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return fallbackApiError;
  }

  const { code, message } = payload.error;
  if (typeof code !== "string" || typeof message !== "string") {
    return fallbackApiError;
  }

  return { code, message };
}
