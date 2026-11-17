// Open-source neural voices that run entirely in the browser (ONNX Runtime Web, WASM).
// Text never leaves the device: only the model files are downloaded, once, from Hugging Face.
//
// Piper (rhasspy, VITS, MIT code) with espeak-ng phonemes (piper_phonemize WASM build), chosen for
// speed: about 4x faster than real time on one WASM thread. Kokoro-82M sounded more natural but ran
// 2.6-10x slower than real time in the browser, so it was dropped (see evals/TTS.md).
// English voices are trained on public-domain data; the Hindi and Malayalam voices on datasets
// licensed for NON-COMMERCIAL use (see `licence`).

export type TtsLang = "en" | "hi" | "ml";

export const HF = "https://huggingface.co";
export const PIPER_BASE = `${HF}/rhasspy/piper-voices/resolve/main`;

export interface VoiceInfo {
  id: string;
  engine: "piper";
  lang: TtsLang;
  /** Shown in Settings. */
  label: string;
  gender: "female" | "male";
  /** espeak-ng voice used to turn text into phonemes. */
  espeak: string;
  /** One-time download in MB. */
  sizeMB: number;
  licence: string;
  /** Safe to ship in a commercial product. */
  commercialOk: boolean;
  source: string;
  /** Piper: path of the .onnx file inside rhasspy/piper-voices. */
  piperPath: string;
}

export const VOICES: VoiceInfo[] = [
  {
    id: "piper-en-ljspeech",
    engine: "piper",
    lang: "en",
    label: "Linda (Piper, fast)",
    gender: "female",
    espeak: "en-us",
    sizeMB: 61,
    licence: "Public domain (LJ Speech) training data, MIT model",
    commercialOk: true,
    source: `${HF}/rhasspy/piper-voices/tree/main/en/en_US/ljspeech/medium`,
    piperPath: "en/en_US/ljspeech/medium/en_US-ljspeech-medium.onnx",
  },
  {
    id: "piper-en-kristin",
    engine: "piper",
    lang: "en",
    label: "Kristin (Piper, fast)",
    gender: "female",
    espeak: "en-us",
    sizeMB: 61,
    licence: "Public domain (LibriVox) training data, MIT model",
    commercialOk: true,
    source: `${HF}/rhasspy/piper-voices/tree/main/en/en_US/kristin/medium`,
    piperPath: "en/en_US/kristin/medium/en_US-kristin-medium.onnx",
  },
  {
    id: "piper-hi-priyamvada",
    engine: "piper",
    lang: "hi",
    label: "Priyamvada (Piper, fast)",
    gender: "female",
    espeak: "hi",
    sizeMB: 61,
    licence: "CC BY-NC-SA 4.0 (training data)",
    commercialOk: false,
    source: `${HF}/rhasspy/piper-voices/tree/main/hi/hi_IN/priyamvada/medium`,
    piperPath: "hi/hi_IN/priyamvada/medium/hi_IN-priyamvada-medium.onnx",
  },
  {
    id: "piper-hi-rohan",
    engine: "piper",
    lang: "hi",
    label: "Rohan (Piper, fast)",
    gender: "male",
    espeak: "hi",
    sizeMB: 60,
    licence: "IndicTTS licence, non-commercial (training data)",
    commercialOk: false,
    source: `${HF}/rhasspy/piper-voices/tree/main/hi/hi_IN/rohan/medium`,
    piperPath: "hi/hi_IN/rohan/medium/hi_IN-rohan-medium.onnx",
  },
  {
    id: "piper-ml-meera",
    engine: "piper",
    lang: "ml",
    label: "Meera (Piper, fast)",
    gender: "female",
    espeak: "ml",
    sizeMB: 60,
    licence: "IndicTTS licence, non-commercial (training data)",
    commercialOk: false,
    source: `${HF}/rhasspy/piper-voices/tree/main/ml/ml_IN/meera/medium`,
    piperPath: "ml/ml_IN/meera/medium/ml_IN-meera-medium.onnx",
  },
  {
    id: "piper-ml-arjun",
    engine: "piper",
    lang: "ml",
    label: "Arjun (Piper, fast)",
    gender: "male",
    espeak: "ml",
    sizeMB: 60,
    licence: "IndicTTS licence, non-commercial (training data)",
    commercialOk: false,
    source: `${HF}/rhasspy/piper-voices/tree/main/ml/ml_IN/arjun/medium`,
    piperPath: "ml/ml_IN/arjun/medium/ml_IN-arjun-medium.onnx",
  },
];

/** Default voice per language: the Piper voice Whisper understood best in evals/TTS.md. */
export const DEFAULT_VOICE: Record<TtsLang, string> = {
  en: "piper-en-ljspeech",
  hi: "piper-hi-priyamvada",
  ml: "piper-ml-meera",
};

export function voiceById(id: string | undefined): VoiceInfo | undefined {
  return VOICES.find((v) => v.id === id);
}

export function voicesFor(lang: TtsLang): VoiceInfo[] {
  return VOICES.filter((v) => v.lang === lang);
}

/** URLs a voice needs (model and config). Used for download status and deletion. */
export function voiceFiles(v: VoiceInfo): string[] {
  return [`${PIPER_BASE}/${v.piperPath}`, `${PIPER_BASE}/${v.piperPath}.json`];
}
