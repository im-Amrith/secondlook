import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useOptionalApp } from "../app-context";
import { sentences } from "./text";
import { chosenVoice, detectLang, isDownloaded, speaker, systemVoiceFor, SHARED_DOWNLOAD_MB, type SpeakerState } from "./speaker";
import { VOICES, type TtsLang, type VoiceInfo } from "./voices";

export function useSpeakerState(): SpeakerState {
  const s = speaker();
  return useSyncExternalStore((cb) => s.subscribe(cb), () => s.state, () => s.state);
}

/** Consecutive sentences in the same script, so mixed Hindi/English results use the right voice. */
export function splitByLang(text: string): { lang: TtsLang; text: string }[] {
  const out: { lang: TtsLang; text: string }[] = [];
  for (const sentence of sentences(text)) {
    const lang = detectLang(sentence);
    const last = out.at(-1);
    if (last && last.lang === lang) last.text += ` ${sentence}`;
    else out.push({ lang, text: sentence });
  }
  return out;
}

export interface VoiceOffer {
  lang: TtsLang;
  voice: VoiceInfo;
  /** Download size including the shared speech data. */
  mb: number;
}

type Plan = { kind: "neural"; voice: VoiceInfo } | { kind: "system"; voice: SpeechSynthesisVoice } | { kind: "none" };

async function planFor(lang: TtsLang, choice: Partial<Record<TtsLang, string>> | undefined): Promise<Plan> {
  const v = chosenVoice(lang, choice);
  if (choice?.[lang] !== "system" && (await isDownloaded(v))) return { kind: "neural", voice: v };
  const sys = systemVoiceFor(lang);
  return sys ? { kind: "system", voice: sys } : { kind: "none" };
}

export function useReadAloud() {
  const app = useOptionalApp();
  const choice = app?.settings.voices;
  const rate = app?.settings.speechRate ?? 1;
  const state = useSpeakerState();
  const [offer, setOffer] = useState<VoiceOffer | null>(null);
  const [failed, setFailed] = useState(false);
  const run = useRef(0);
  const pendingText = useRef("");

  const speak = useCallback(
    async (text: string) => {
      const token = ++run.current;
      setFailed(false);
      setOffer(null);
      const parts = splitByLang(text);
      if (!parts.length) return;
      const plans = new Map<TtsLang, Plan>();
      for (const p of parts) if (!plans.has(p.lang)) plans.set(p.lang, await planFor(p.lang, choice));
      // The main language has no voice at all: offer the download instead of staying silent.
      const main = parts.reduce((a, b) => (b.text.length > a.text.length ? b : a)).lang;
      if (plans.get(main)!.kind === "none") {
        const voice = chosenVoice(main, choice);
        pendingText.current = text;
        const anyNeural = (await Promise.all(VOICES.map(isDownloaded))).some(Boolean);
        setOffer({ lang: main, voice, mb: voice.sizeMB + (anyNeural ? 0 : SHARED_DOWNLOAD_MB) });
        return;
      }
      try {
        for (const p of parts) {
          if (token !== run.current) return;
          const plan = plans.get(p.lang)!;
          if (plan.kind === "neural") await speaker().speakNeural(plan.voice, p.text, rate);
          else if (plan.kind === "system") await speaker().speakSystem(plan.voice, p.text, rate);
        }
      } catch {
        setFailed(true);
      }
    },
    [choice, rate],
  );

  const stop = useCallback(() => {
    run.current++;
    speaker().stop();
  }, []);

  const acceptOffer = useCallback(async () => {
    if (!offer) return;
    const { voice } = offer;
    setOffer(null);
    try {
      await speaker().prepare(voice);
      await speak(pendingText.current);
    } catch {
      setFailed(true);
    }
  }, [offer, speak]);

  useEffect(() => () => {
    // Leaving the page stops the voice.
    run.current++;
    speaker().stop();
  }, []);

  return { speak, stop, state, offer, acceptOffer, dismissOffer: () => setOffer(null), failed };
}
