import { translate, type Locale } from "../i18n/messages";
export function navigationTabs(path: string, locale: Locale) {
  return [
    {href: "/", icon: "home", label: translate("today", locale), active: path === "/"},
    {href: "/training", icon: "activity", label: translate("train", locale), active: path.startsWith("/training") && !path.startsWith("/training/coach")},
    {href: "/avatar", icon: "user", label: translate("avatar", locale), active: path.startsWith("/avatar") || path.startsWith("/inbody")},
    {href: "/nutrition", icon: "heart", label: translate("nutrition", locale), active: path.startsWith("/nutrition")},
    {href: "/league", icon: "award", label: translate("leagueTab", locale), active: ["/league", "/community", "/challenges", "/rewards", "/missions"].some(route => path.startsWith(route))},
  ] as const;
}
export function showContextualCoach(path: string) {
  return path === "/" || path.startsWith("/avatar") || (path.startsWith("/training") && !["/training/coach", "/training/day", "/training/manual"].includes(path));
}
