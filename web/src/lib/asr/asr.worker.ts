/// <reference lib="webworker" />
// On-device speech recognition for Call Guard: open Whisper models (Hugging Face, ONNX) run by
// Transformers.js in this worker. Audio arrives as 16 kHz PCM from the page and never leaves the
// device; the only network requests are for the model files, cached after the first time.
import type { TtsLang } from "../tts/voices";
import { ASR_MODELS, WHISPER_LANG, type AsrIn, type AsrOut } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;
const post = (m: AsrOut) => self.postMessage(m);

type Transcriber = ((audio: Float32Array, opts: object) => Promise<{ text: string }>) & { dispose?: () => Promise<void> };
/** One model in memory at a time (they are large); switching language swaps it. */
let current: { lang: TtsLang; ready: Promise<{ run: Transcriber; device: "webgpu" | "wasm" }> } | null = null;

async function hasWebGpu(): Promise<boolean> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    return Boolean(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

async function create(lang: TtsLang, id: number) {
  const tf = await import("@huggingface/transformers");
  tf.env.allowLocalModels = false;
  // Use the ONNX Runtime WASM that Vite bundles (no CDN), single-threaded: the page isn't
  // cross-origin isolated.
  const wasm = (tf.env.backends.onnx as { wasm?: { wasmPaths?: unknown; numThreads?: number } }).wasm;
  if (wasm) {
    delete wasm.wasmPaths;
    wasm.numThreads = 1;
  }
  const model = ASR_MODELS[lang];
  const device = (await hasWebGpu()) ? "webgpu" : "wasm";
  const files = new Map<string, { loaded: number; total: number }>();
  const progress_callback = (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== "progress" || !p.file || !p.total) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
    let loaded = 0, total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    post({ id, type: "progress", loaded, total });
  };
  // Large downloads over slow connections sometimes drop; finished files stay cached, so a retry
  // continues with what's missing.
  for (let attempt = 0; ; attempt++) {
    try {
      const run = (await tf.pipeline("automatic-speech-recognition", model.id, { device, dtype: model.dtype[device], progress_callback } as never)) as unknown as Transcriber;
      return { run, device: device as "webgpu" | "wasm" };
    } catch (e) {
      if (attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

function load(lang: TtsLang, id: number) {
  if (current?.lang === lang) return current.ready;
  const old = current;
  void old?.ready.then((a) => a.run.dispose?.()).catch(() => undefined);
  const ready = create(lang, id);
  current = { lang, ready };
  ready.catch(() => {
    if (current?.ready === ready) current = null;
  });
  return ready;
}

self.onmessage = async (e: MessageEvent<AsrIn>) => {
  const m = e.data;
  try {
    const a = await load(m.lang, m.id);
    if (m.type === "load") return post({ id: m.id, type: "ready", device: a.device });
    const model = ASR_MODELS[m.lang];
    const opts = model.languageHint ? { language: WHISPER_LANG[m.lang], task: model.task ?? "transcribe", no_repeat_ngram_size: 3 } : { no_repeat_ngram_size: 3 };
    const out = await a.run(m.pcm, opts);
    post({ id: m.id, type: "text", text: out.text ?? "" });
  } catch (err) {
    post({ id: m.id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
