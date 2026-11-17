/// <reference lib="webworker" />
// Runs the open TTS models off the main thread. Text stays inside this worker; the only network
// requests are for model files (Hugging Face), cached after the first time.
import createPiperPhonemize from "@diffusionstudio/piper-wasm/build/piper_phonemize.js";
import phonemizeWasmUrl from "@diffusionstudio/piper-wasm/build/piper_phonemize.wasm?url";
import phonemizeDataUrl from "@diffusionstudio/piper-wasm/build/piper_phonemize.data?url";
import { createSynthesizer } from "./engine";
import { createPhonemizer, type PhonemizeFactory } from "./phonemize";
import { voiceById } from "./voices";
import type { OrtLike } from "./piper";
import { VOICE_CACHE, type WorkerIn, type WorkerOut } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;
const post = (m: WorkerOut, transfer: Transferable[] = []) => self.postMessage(m, transfer);

let current = 0;

/**
 * Use the runtime WASM Vite bundled with the app (no CDN, so it also works in the MV3 extension),
 * single-threaded since the page isn't cross-origin isolated. Transformers.js would otherwise
 * point wasmPaths at jsDelivr.
 */
function configureOrt(env: { wasm: { wasmPaths?: unknown; numThreads?: number } }) {
  delete env.wasm.wasmPaths;
  env.wasm.numThreads = 1;
}
let progressId = 0;

async function loadBytes(url: string): Promise<ArrayBuffer> {
  let cache: Cache | undefined;
  try {
    cache = await caches.open(VOICE_CACHE);
    const hit = await cache.match(url);
    if (hit) return await hit.arrayBuffer();
  } catch {
    /* no Cache API (e.g. private mode): just download */
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`);
  const total = Number(res.headers.get("Content-Length") ?? 0);
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    if (total > 1_000_000) post({ id: progressId, type: "progress", file: url.split("/").pop()!, loaded, total });
  }
  const bytes = new Uint8Array(loaded);
  let o = 0;
  for (const p of parts) {
    bytes.set(p, o);
    o += p.length;
  }
  try {
    await cache?.put(url, new Response(bytes, { headers: { "Content-Type": "application/octet-stream" } }));
  } catch {
    /* quota: still works this session */
  }
  return bytes.buffer;
}

const synth = createSynthesizer({
  loadBytes,
  configureKokoro: (env) => configureOrt(env.backends.onnx as never),
  progress: (p) => post({ id: progressId, type: "progress", ...p }),
  phonemize: async () => {
    const abs = (u: string) => new URL(u, self.location.href).href;
    const [wasm, data] = await Promise.all([loadBytes(abs(phonemizeWasmUrl)), loadBytes(abs(phonemizeDataUrl))]);
    return createPhonemizer({ factory: createPiperPhonemize as unknown as PhonemizeFactory, wasm, data });
  },
  piperOrt: async () => {
    const ort = await import("onnxruntime-web");
    configureOrt(ort.env);
    return ort as unknown as OrtLike;
  },
});

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  if (msg.type === "cancel") {
    if (msg.id === current) current = 0;
    return;
  }
  const v = voiceById(msg.voiceId);
  if (!v) return post({ id: msg.id, type: "error", message: `unknown voice ${msg.voiceId}` });
  current = msg.id;
  progressId = msg.id;
  try {
    if (msg.type === "prepare") {
      await synth.prepare(v);
    } else {
      for await (const a of synth.stream(v, msg.text, msg.speed)) {
        if (current !== msg.id) return; // cancelled: stop generating
        const pcm = new Float32Array(a.pcm); // own buffer, so it can be transferred
        post({ id: msg.id, type: "chunk", pcm, sampleRate: a.sampleRate }, [pcm.buffer]);
      }
    }
    post({ id: msg.id, type: "done" });
  } catch (err) {
    post({ id: msg.id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
