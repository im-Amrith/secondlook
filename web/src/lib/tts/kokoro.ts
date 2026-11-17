// Kokoro-82M v1.0 (Apache-2.0) through Transformers.js. Same steps as kokoro-js, but with our own
// espeak phonemes so Hindi works too (kokoro-js only phonemizes English).
import { HF, KOKORO_REPO } from "./voices";

export type LoadBytes = (url: string) => Promise<ArrayBuffer>;
export type Progress = (p: { file: string; loaded: number; total: number }) => void;

interface TokenizerOut { input_ids: { dims: number[] } }
type Tokenizer = (text: string, opts: { truncation: boolean }) => TokenizerOut;
type Model = (inputs: Record<string, unknown>) => Promise<{ waveform: { data: Float32Array } }>;

export const KOKORO_RATE = 24000;

/** espeak IPA → Kokoro's symbol set (the same substitutions kokoro-js / misaki make). */
export function toKokoroPhonemes(symbols: string[], lang: string): string {
  let s = symbols.join("");
  s = s.replace(/ʲ/g, "j").replace(/r/g, "ɹ").replace(/x/g, "k").replace(/ɬ/g, "l");
  if (lang.startsWith("en")) s = s.replace(/(?<=nˈaɪn)ti(?!ː)/g, "di");
  return s.trim();
}

export interface KokoroEngine {
  synth(phonemes: string, voice: string, speed?: number): Promise<Float32Array>;
}

export async function createKokoro(loadBytes: LoadBytes, progress?: Progress, device: "wasm" | "cpu" = "wasm",
  configure?: (env: { backends: { onnx: unknown }; allowLocalModels: boolean }) => void,
): Promise<KokoroEngine> {
  const tf = await import("@huggingface/transformers");
  tf.env.allowLocalModels = false;
  configure?.(tf.env as never);
  const onProgress = (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status === "progress" && p.file) progress?.({ file: p.file, loaded: p.loaded ?? 0, total: p.total ?? 0 });
  };
  const [model, tokenizer] = (await Promise.all([
    tf.StyleTextToSpeech2Model.from_pretrained(KOKORO_REPO, { dtype: "q8", device, progress_callback: onProgress }),
    tf.AutoTokenizer.from_pretrained(KOKORO_REPO, { progress_callback: onProgress }),
  ])) as unknown as [Model, Tokenizer];

  const styles = new Map<string, Float32Array>();
  async function style(voice: string): Promise<Float32Array> {
    let s = styles.get(voice);
    if (!s) {
      s = new Float32Array(await loadBytes(`${HF}/${KOKORO_REPO}/resolve/main/voices/${voice}.bin`));
      styles.set(voice, s);
    }
    return s;
  }

  return {
    async synth(phonemes, voice, speed = 1) {
      const { input_ids } = tokenizer(phonemes, { truncation: true });
      const n = input_ids.dims.at(-1) ?? 0;
      const all = await style(voice);
      const offset = 256 * Math.min(Math.max(n - 2, 0), 509);
      const ref = all.slice(offset, offset + 256);
      const { waveform } = await model({
        input_ids,
        style: new tf.Tensor("float32", ref, [1, 256]),
        speed: new tf.Tensor("float32", [speed], [1]),
      });
      return waveform.data;
    },
  };
}
