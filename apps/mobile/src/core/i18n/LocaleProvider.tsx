import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { LanguageDirection } from "../components/DirectionalText";
import { normalizeLocale, setCurrentLocale, translate, type Locale, type MessageKey } from "./messages";

const key = "bonyan.locale.v2";
async function read() {
  if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage.getItem(key);
  return (await import("expo-secure-store")).getItemAsync(key);
}
async function write(locale: Locale) {
  if (typeof globalThis.localStorage !== "undefined") { globalThis.localStorage.setItem(key, locale); return; }
  await (await import("expo-secure-store")).setItemAsync(key, locale);
}
type LocaleContextValue = { locale: Locale; rtl: boolean; setLocale: (value: Locale) => Promise<void>; t: (key: MessageKey) => string };
const Context = createContext<LocaleContextValue | null>(null);
export function LocaleProvider({children}: PropsWithChildren) {
  const [locale, update] = useState<Locale>("en");
  const chosen = useRef(false);
  const pendingWrite = useRef(Promise.resolve());
  useEffect(() => { let active = true; void read().then(value => { if (active && value && !chosen.current) { const next = normalizeLocale(value); setCurrentLocale(next); update(next); } }).catch(() => {}); return () => { active = false; }; }, []);
  const setLocale = useCallback(async (value: Locale) => {
    chosen.current = true;
    setCurrentLocale(value); update(value);
    const operation = pendingWrite.current.catch(() => {}).then(() => write(value));
    pendingWrite.current = operation;
    await operation;
  }, []);
  return <Context.Provider value={{locale, rtl: locale === "ar-EG", setLocale, t: key => translate(key, locale)}}><LanguageDirection.Provider value={locale === "ar-EG"}>{children}</LanguageDirection.Provider></Context.Provider>;
}
export function useLocale() { const value = useContext(Context); if (!value) throw new Error("LocaleProvider required"); return value; }
