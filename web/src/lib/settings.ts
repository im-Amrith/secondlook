// Per-device settings in localStorage (a convenience; never security-relevant beyond this device).
import { useCallback, useState } from "react";
import type { UiLang } from "./i18n";

export interface Settings {
  neverCloud: boolean;
  /** Offer to alert the family circle on high-risk results. */
  familyAlerts: boolean;
  onboarded: boolean;
  largeText: boolean;
  uiLang: UiLang;
}

export const DEFAULT_SETTINGS: Settings = { neverCloud: false, familyAlerts: true, onboarded: false, largeText: false, uiLang: "en" };
const KEY = "sl.settings.v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode etc. */
  }
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [s, setS] = useState<Settings>(loadSettings);
  const update = useCallback((patch: Partial<Settings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);
  return [s, update];
}
