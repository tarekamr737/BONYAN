import { afterEach, describe, expect, it, vi } from "vitest";
import { readIntroCompleted, storeIntroCompleted } from "../src/core/auth/introStorage";
import { introSlides } from "../src/features/auth/introSlides";

afterEach(() => vi.unstubAllGlobals());
describe("first launch preference", () => {
  it("persists completion independently of session storage", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value)});
    expect(await readIntroCompleted()).toBe(false);
    await storeIntroCompleted();
    vi.stubGlobal("sessionStorage", {getItem: () => null});
    expect(await readIntroCompleted()).toBe(true);
  });
  it("surfaces a failed save instead of reporting completion", async () => {
    vi.stubGlobal("localStorage", {setItem: () => {throw new Error("Storage unavailable");}});
    await expect(storeIntroCompleted()).rejects.toThrow("Storage unavailable");
  });
  it("introduces military and gym before supporting features", () => {
    expect(introSlides).toHaveLength(7);
    expect(introSlides[1].en).toBe("Prepare with purpose");
    expect(introSlides[2].image).toBe("gym");
    for (const slide of introSlides) expect(slide.ar).toMatch(/[\u0600-\u06ff]/);
  });
});
