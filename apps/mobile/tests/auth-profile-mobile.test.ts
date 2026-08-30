import { afterEach, describe, expect, it, vi } from "vitest";

import { getAccessToken, setSessionAccessToken } from "../src/core/auth/session";
import { login, register } from "../src/features/auth/api/authApi";
import { getMyProfile, updateMyProfile } from "../src/features/auth/api/profileApi";
import {
  profileDraftToUpdate,
  profileToDraft,
  validateProfileDraft,
} from "../src/features/auth/profileDraft";

afterEach(() => {
  setSessionAccessToken(null);
  vi.unstubAllGlobals();
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("mobile auth and profile contracts", () => {
  it("registers and signs in without accepting a client-selected user ID", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        jsonResponse({ access_token: "signed", expires_in: 3600, token_type: "bearer" }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await register({ email: "person@example.com", password: "long-test-password" });
    await login({ email: "person@example.com", password: "long-test-password" });

    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/auth/register");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/api/v1/auth/login");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ email: "person@example.com", password: "long-test-password" });
    expect(body).not.toHaveProperty("user_id");
  });

  it("uses only the current-user profile endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ onboarding_completed: false })));
    vi.stubGlobal("fetch", fetchMock);

    await getMyProfile();
    await updateMyProfile({ display_name: "Tarek" });

    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/me");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/api/v1/me");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      display_name: "Tarek",
    });
  });

  it("clears the active session after an authenticated 401", async () => {
    setSessionAccessToken("expired-token");
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { code: "unauthorized", message: "Sign in to continue." } }, 401),
      ),
    );

    await expect(getMyProfile()).rejects.toThrow("Sign in to continue.");
    expect(getAccessToken()).toBeNull();
  });

  it("normalizes the minimum onboarding payload", () => {
    const draft = profileToDraft();
    draft.displayName = "  Tarek   Ahmed ";
    draft.availableEquipment = ["dumbbell", "bodyweight", "dumbbell"];

    expect(validateProfileDraft(draft)).toBeNull();
    expect(profileDraftToUpdate(draft, true)).toMatchObject({
      available_equipment: ["bodyweight", "dumbbell"],
      display_name: "Tarek Ahmed",
      onboarding_completed: true,
    });
  });
});
