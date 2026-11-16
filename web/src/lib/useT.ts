import { useCallback } from "react";
import { useOptionalApp } from "./app-context";
import { translate, type Key, type UiLang } from "./i18n";

/** The UI language and a translate function bound to it. */
export function useT(): { lang: UiLang; t: (key: Key, vars?: Record<string, string | number>) => string } {
  const lang = useOptionalApp()?.settings.uiLang ?? "en";
  const t = useCallback((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  return { lang, t };
}
