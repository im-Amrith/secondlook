import type { TtsLang } from "../tts/voices";

type Dtype = { encoder_model: string; decoder_model_merged: string };

export interface AsrModel {
  id: string;
  /** One-time download in MB, shown before the person agrees. */
  sizeMB: number;
  /** WebGPU and WASM builds (4-bit keeps the download and memory down). */
  dtype: { webgpu: Dtype; wasm: Dtype };
  licence: string;
  source: string;
  /**
   * Pass Whisper's language/task options. False for single-language fine-tunes: their config marks
   * them as not multilingual, and Transformers.js rejects a language for those.
   */
  languageHint: boolean;
  /**
   * "translate": Whisper turns the speech into English text. Used for Malayalam, where stock
   * Whisper's Malayalam transcripts are unusable but its English translation keeps the scam
   * phrases the rules look for (evals/ASR.md).
   */
  task?: "transcribe" | "translate";
}

const Q4: Dtype = { encoder_model: "q4", decoder_model_merged: "q4" };
const Q8: Dtype = { encoder_model: "q8", decoder_model_merged: "q8" };

/**
 * Open Whisper models from Hugging Face, one per call language. Chosen with scripts/asr-eval.mts
 * (see evals/ASR.md): stock whisper-base often writes Hindi in Urdu script and Malayalam as Tamil,
 * so Hindi uses a Hindi fine-tune of Whisper small, and Malayalam uses Whisper small translating
 * the call into English (its Malayalam transcripts loop and garble; the translation reached
 * "hang up" on the test call).
 */
export const ASR_MODELS: Record<TtsLang, AsrModel> = {
  en: { id: "onnx-community/whisper-base", sizeMB: 80, dtype: { webgpu: Q8, wasm: Q8 }, licence: "MIT (OpenAI Whisper)", source: "https://huggingface.co/onnx-community/whisper-base", languageHint: true },
  hi: { id: "onnx-community/whisper-hindi-small-ONNX", sizeMB: 300, dtype: { webgpu: Q4, wasm: Q4 }, licence: "Apache-2.0 (vasista22/whisper-hindi-small)", source: "https://huggingface.co/vasista22/whisper-hindi-small", languageHint: false },
  ml: { id: "onnx-community/whisper-small", sizeMB: 300, dtype: { webgpu: Q4, wasm: Q4 }, licence: "MIT (OpenAI Whisper)", source: "https://huggingface.co/onnx-community/whisper-small", languageHint: true, task: "translate" },
};

/** @deprecated single-model constant kept for older imports. */
export const ASR_MODEL = ASR_MODELS.en.id;

export const WHISPER_LANG: Record<TtsLang, string> = { en: "english", hi: "hindi", ml: "malayalam" };

export type AsrIn =
  | { id: number; type: "load"; lang: TtsLang }
  | { id: number; type: "transcribe"; pcm: Float32Array; lang: TtsLang };
export type AsrOut =
  | { id: number; type: "progress"; loaded: number; total: number }
  | { id: number; type: "ready"; device: "webgpu" | "wasm" }
  | { id: number; type: "text"; text: string }
  | { id: number; type: "error"; message: string };
