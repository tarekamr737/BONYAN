import { describe, expect, it } from "vitest";
import { formatDate, formatNumber, localeDirection, localizedError, messages, normalizeLocale, translate } from "../src/core/i18n/messages";
import { navigationTabs, showContextualCoach } from "../src/core/navigation/tabs";
describe("V2 locale and navigation contracts", () => {
  it("has complete translations and normalizes legacy Arabic", () => {
    expect(normalizeLocale("ar")).toBe("ar-EG");
    for (const pair of Object.values(messages)) { expect(pair[0].length).toBeGreaterThan(0); expect(pair[1]).toMatch(/[\u0600-\u06ff]/); }
    expect(localeDirection("ar-EG")).toBe("rtl"); expect(localeDirection("en")).toBe("ltr");
  });
  it.each(["en", "ar-EG"] as const)("keeps five destinations with Avatar centered in %s", locale => {
    const tabs = navigationTabs("/avatar", locale); expect(tabs).toHaveLength(5); expect(tabs[2].href).toBe("/avatar"); expect(tabs.filter(t => t.active)).toHaveLength(1);
    expect(tabs.some(t => t.href === "/training/coach" as string)).toBe(false);
  });
  it("localizes unknown errors without leaking server strings", () => { expect(localizedError("private_provider_response", "ar-EG")).toBe(translate("request_failed", "ar-EG")); });
  it.each(["en", "ar-EG"] as const)("opens the League from the social destination in %s", locale => {
    for(const path of ["/league", "/community", "/community/create", "/challenges", "/rewards"]) {
      const tabs = navigationTabs(path, locale);
      expect(tabs[4]).toMatchObject({href: "/league", label: translate("leagueTab", locale), active: true});
      expect(tabs.filter(tab => tab.active)).toHaveLength(1);
    }
  });
  it("does not overlap workout logging or Coach", () => { expect(showContextualCoach("/training/day")).toBe(false); expect(showContextualCoach("/training/coach")).toBe(false); expect(showContextualCoach("/avatar")).toBe(true); });
  it("preserves space for exercise previews and the manual builder's review action", () => {
    expect(showContextualCoach("/training/manual")).toBe(false);
    expect(showContextualCoach("/training")).toBe(true);
  });
  it("formats dates in the user's timezone and locale", () => { expect(formatNumber(12, "en")).toBe("12"); expect(formatDate("2026-10-11T23:30:00Z", "en", "Africa/Cairo")).toContain("12"); });
});
