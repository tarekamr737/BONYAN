import { translate, type Locale } from "../i18n/messages";
export function navigationTabs(path: string, locale: Locale) {
  return [
    {href: "/", icon: "home", label: translate("today", locale), active: path === "/"},
    {href: "/training", icon: "activity", label: translate("train", locale), active: path.startsWith("/training") && !path.startsWith("/training/coach")},
    {href: "/avatar", icon: "user", label: translate("avatar", locale), active: path.startsWith("/avatar") || path.startsWith("/inbody")},
    {href: "/nutrition", icon: "heart", label: translate("nutrition", locale), active: path.startsWith("/nutrition")},
    {href: "/community", icon: "users", label: translate("community", locale), active: path.startsWith("/community")},
  ] as const;
}
export function showContextualCoach(path: string) {
  return path === "/" || path.startsWith("/avatar") || (path.startsWith("/training") && path !== "/training/coach" && path !== "/training/day");
}
