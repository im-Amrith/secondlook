// Small fixes to Whisper's output before the Call Guard rules read it. Pure; used in the browser
// worker and in scripts/asr-eval.mts.
import type { TtsLang } from "./tts/voices";

/**
 * Whisper often writes Malayalam speech in Devanagari letters. The Indic Unicode blocks are laid
 * out in parallel (ISCII order), so shift those letters into the Malayalam block. Approximate,
 * but it turns most words back into readable Malayalam the rules can match.
 */
export function devanagariToMalayalam(s: string): string {
  return s.replace(/[ऀ-ॿ]/g, (c) => {
    const cp = c.charCodeAt(0);
    // Danda and double danda are shared punctuation; keep them.
    if (cp === 0x0964 || cp === 0x0965) return c;
    return String.fromCharCode(cp + 0x400);
  });
}

/** Whisper "hallucinations" on silence or noise that should never reach the rules. */
const NOISE = /^\s*(\[[^\]]*\]|\([^)]*\)|thank you\.?|thanks for watching!?|subtitles by .*|\.+|…)\s*$/i;

export function fixScript(text: string, lang: TtsLang): string {
  if (NOISE.test(text)) return "";
  return lang === "ml" ? devanagariToMalayalam(text) : text;
}
