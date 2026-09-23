import { apiRequest } from "../../../core/api/client";
import type { AccessTokenResponse, AuthCredentials, EmailRegistrationStarted } from "../types";

export function register(credentials: AuthCredentials): Promise<EmailRegistrationStarted> {
  return apiRequest<EmailRegistrationStarted>("/api/v1/auth/register", {
    body: credentials,
    method: "POST",
  });
}

export function verifyEmail(challengeId: string, code: string): Promise<AccessTokenResponse> {
  return apiRequest<AccessTokenResponse>("/api/v1/auth/verify-email", {
    body: { challenge_id: challengeId, code },
    method: "POST",
  });
}

export function loginWithGoogle(idToken: string): Promise<AccessTokenResponse> {
  return apiRequest<AccessTokenResponse>("/api/v1/auth/google", {
    body: { id_token: idToken },
    method: "POST",
  });
}

export function login(credentials: AuthCredentials): Promise<AccessTokenResponse> {
  return apiRequest<AccessTokenResponse>("/api/v1/auth/login", {
    body: credentials,
    method: "POST",
  });
}
