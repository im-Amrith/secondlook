// Text → audio for any catalogue voice. Environment-agnostic: the browser worker and the Node
// sample script inject the phonemizer, the byte loader and the ONNX runtime.
import { chunkForSpeech } from "./text";
import { createKokoro, KOKORO_RATE, toKokoroPhonemes, type KokoroEngine, type LoadBytes, type Progress } from "./kokoro";
import { createPiperVoice, type OrtLike, type PiperVoice } from "./piper";
import type { Phonemizer } from "./phonemize";
import type { VoiceInfo } from "./voices";

export interface EngineDeps {
  phonemize: () => Promise<Phonemizer>;
  loadBytes: LoadBytes;
  piperOrt: () => Promise<OrtLike>;
  progress?: Progress;
  /** ONNX device: "wasm" in the browser, "cpu" in Node. */
  kokoroDevice?: "wasm" | "cpu";
  /** Adjust Transformers.js settings (e.g. where the runtime WASM lives). */
  configureKokoro?: (env: { backends: { onnx: unknown }; allowLocalModels: boolean }) => void;
}

export interface Audio {
  pcm: Float32Array;
  sampleRate: number;
}

export interface Synthesizer {
  /** Make sure the voice's files are downloaded and the model is loaded. */
  prepare(v: VoiceInfo): Promise<void>;
  /** Speak `text`, one chunk at a time (so playback can start after the first sentence). */
  stream(v: VoiceInfo, text: string, speed?: number): AsyncGenerator<Audio>;
}

export function createSynthesizer(deps: EngineDeps): Synthesizer {
  let kokoro: Promise<KokoroEngine> | null = null;
  const piper = new Map<string, Promise<PiperVoice>>();
  let phon: Promise<Phonemizer> | null = null;

  const getPhon = () => (phon ??= deps.phonemize());
  const getKokoro = () => {
    kokoro ??= createKokoro(deps.loadBytes, deps.progress, deps.kokoroDevice, deps.configureKokoro);
    kokoro.catch(() => (kokoro = null));
    return kokoro;
  };
  const getPiper = (v: VoiceInfo) => {
    let p = piper.get(v.id);
    if (!p) {
      p = deps.piperOrt().then((ort) => createPiperVoice(ort, v, deps.loadBytes, deps.kokoroDevice === "cpu" ? ["cpu"] : ["wasm"]));
      p.catch(() => piper.delete(v.id));
      piper.set(v.id, p);
    }
    return p;
  };

  return {
    async prepare(v) {
      await getPhon();
      if (v.engine === "kokoro") {
        const k = await getKokoro();
        // Warm up with a word so the style vector is fetched too.
        await k.synth("hˈɛloʊ", v.kokoroVoice!);
      } else await getPiper(v);
    },
    async *stream(v, text, speed = 1) {
      const phonemize = await getPhon();
      for (const chunk of chunkForSpeech(text)) {
        const ph = await phonemize(chunk, v.espeak);
        if (v.engine === "kokoro") {
          const k = await getKokoro();
          yield { pcm: await k.synth(toKokoroPhonemes(ph.phonemes, v.espeak), v.kokoroVoice!, speed), sampleRate: KOKORO_RATE };
        } else {
          const p = await getPiper(v);
          yield { pcm: await p.synth(ph.ids, speed), sampleRate: p.sampleRate };
        }
      }
    },
  };
}

/** 16-bit mono WAV (for the sample script and "save sample"). */
export function toWav(pcm: Float32Array, sampleRate: number): Uint8Array {
  const buf = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const w = (o: number, s: string) => [...s].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  buf.setUint32(4, 36 + pcm.length * 2, true);
  w(8, "WAVEfmt ");
  buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true);
  buf.setUint16(22, 1, true);
  buf.setUint32(24, sampleRate, true);
  buf.setUint32(28, sampleRate * 2, true);
  buf.setUint16(32, 2, true);
  buf.setUint16(34, 16, true);
  w(36, "data");
  buf.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) buf.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i]!)) * 0x7fff, true);
  return new Uint8Array(buf.buffer);
}
