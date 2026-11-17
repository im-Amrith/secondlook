// Open-source neural voices that run entirely in the browser (ONNX Runtime Web, WASM).
// Text never leaves the device: only the model files are downloaded, once, from Hugging Face.
//
// Two engines, one phonemizer (espeak-ng via the piper_phonemize WASM build):
// - Piper (rhasspy, VITS, MIT code): fast, the default. English voices trained on public-domain
//   data; the Hindi and Malayalam voices on datasets licensed for NON-COMMERCIAL use (see `licence`).
// - Kokoro-82M v1.0 (hexgrad, Apache-2.0): the most natural small open model, English and Hindi,
//   but slow on CPU-only WASM. Offered as an option.

export type TtsLang = "en" | "hi" | "ml";

export const KOKORO_REPO = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const HF = "https://huggingface.co";
export const PIPER_BASE = `${HF}/rhasspy/piper-voices/resolve/main`;

export interface VoiceInfo {
  id: string;
  engine: "kokoro" | "piper";
  lang: TtsLang;
  /** Shown in Settings. */
  label: string;
  gender: "female" | "male";
  /** espeak-ng voice used to turn text into phonemes. */
  espeak: string;
  /** One-time download in MB (Kokoro voices share the 92 MB model). */
  sizeMB: number;
  licence: string;
  /** Safe to ship in a commercial product. */
  commercialOk: boolean;
  source: string;
  /** Kokoro: style vector name. */
  kokoroVoice?: string;
  /** Piper: path of the .onnx file inside rhasspy/piper-voices. */
  piperPath?: string;
}

export const VOICES: VoiceInfo[] = [
  {
    id: "kokoro-en-heart",
    engine: "kokoro",
    lang: "en",
    label: "Heart (Kokoro, most natural, slow)",
    gender: "female",
    espeak: "en-us",
    sizeMB: 93,
    licence: "Apache-2.0",
    commercialOk: true,
    source: `${HF}/hexgrad/Kokoro-82M`,
    kokoroVoice: "af_heart",
  },
  {
    id: "kokoro-en-michael",
    engine: "kokoro",
    lang: "en",
    label: "Michael (Kokoro, slow)",
    gender: "male",
    espeak: "en-us",
    sizeMB: 93,
    licence: "Apache-2.0",
    commercialOk: true,
    source: `${HF}/hexgrad/Kokoro-82M`,
    kokoroVoice: "am_michael",
  },
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
    id: "kokoro-hi-alpha",
    engine: "kokoro",
    lang: "hi",
    label: "Alpha (Kokoro, slow)",
    gender: "female",
    espeak: "hi",
    sizeMB: 93,
    licence: "Apache-2.0",
    commercialOk: true,
    source: `${HF}/hexgrad/Kokoro-82M`,
    kokoroVoice: "hf_alpha",
  },
  {
    id: "kokoro-hi-omega",
    engine: "kokoro",
    lang: "hi",
    label: "Omega (Kokoro, slow)",
    gender: "male",
    espeak: "hi",
    sizeMB: 93,
    licence: "Apache-2.0",
    commercialOk: true,
    source: `${HF}/hexgrad/Kokoro-82M`,
    kokoroVoice: "hm_omega",
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

/**
 * Default voice per language. Piper, because it runs several times faster than real time on one
 * WASM thread; Kokoro sounds more natural but ran 2.5-10x slower than real time in the browser
 * (no WebGPU/threads), which is too long to wait for an older person. Within Piper, the voice
 * Whisper understood best in evals/TTS.md.
 */
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

/** URLs a voice needs (model, config, style vector). Used for download status and deletion. */
export function voiceFiles(v: VoiceInfo): string[] {
  if (v.engine === "piper") return [`${PIPER_BASE}/${v.piperPath}`, `${PIPER_BASE}/${v.piperPath}.json`];
  return [
    `${HF}/${KOKORO_REPO}/resolve/main/onnx/model_quantized.onnx`,
    `${HF}/${KOKORO_REPO}/resolve/main/voices/${v.kokoroVoice}.bin`,
  ];
}
