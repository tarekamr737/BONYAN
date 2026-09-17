import { afterEach, describe, expect, it, vi } from "vitest";

import { setSessionAccessToken } from "../src/core/auth/session";
import { uploadAvatarSourcePhoto } from "../src/features/avatar/api";

afterEach(() => {
  setSessionAccessToken(null);
  vi.unstubAllGlobals();
});

describe("Avatar private source upload", () => {
  it("uploads the selected photo with the trusted bearer token", async () => {
    setSessionAccessToken("signed-access-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "source-photo-1" }), {
        headers: { "Content-Type": "application/json" },
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadAvatarSourcePhoto({
      file: new Blob(["photo"], { type: "image/jpeg" }),
      name: "source.jpg",
      type: "image/jpeg",
      uri: "file:///source.jpg",
    });

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(result.id).toBe("source-photo-1");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/avatars/source-photos");
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer signed-access-token");
    expect((options.body as FormData).get("photo")).toBeInstanceOf(Blob);
  });
});
