// Per-device settings in localStorage (a convenience; never security-relevant beyond this device).
import { useCallback, useState } from "react";
import type { UiLang } from "./i18n";
import type { TtsLang } from "./tts/voices";

export interface Settings {
  neverCloud: boolean;
  /** Offer to alert the family circle on high-risk results. */
  familyAlerts: boolean;
  onboarded: boolean;
  largeText: boolean;
  uiLang: UiLang;
  /** Chosen neural read-aloud voice per language (ids from tts/voices.ts). */
  voices: Partial<Record<TtsLang, string>>;
  /** Read-aloud speed: 1 normal, 0.85 slower. */
  speechRate: number;
  /** Read the result aloud as soon as it appears. */
  autoRead: boolean;
  /** Someone to call before paying (pause screen, Call Guard). Stored only on this device. */
  trustedName: string;
  trustedPhone: string;
  /** Length of the pause-before-paying countdown. */
  pauseSeconds: number;
}

export const DEFAULT_SETTINGS: Settings = { neverCloud: false, familyAlerts: true, onboarded: false, largeText: false, uiLang: "en", voices: {}, speechRate: 1, autoRead: false, trustedName: "", trustedPhone: "", pauseSeconds: 60 };
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
