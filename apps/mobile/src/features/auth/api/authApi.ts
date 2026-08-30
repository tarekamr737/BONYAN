import { apiRequest } from "../../../core/api/client";
import type { AccessTokenResponse, AuthCredentials } from "../types";

export function register(credentials: AuthCredentials): Promise<AccessTokenResponse> {
  return apiRequest<AccessTokenResponse>("/api/v1/auth/register", {
    body: credentials,
    method: "POST",
  });
}

export function login(credentials: AuthCredentials): Promise<AccessTokenResponse> {
  return apiRequest<AccessTokenResponse>("/api/v1/auth/login", {
    body: credentials,
    method: "POST",
  });
}
