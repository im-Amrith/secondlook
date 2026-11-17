// Generates WAV samples for every voice in web/src/lib/tts/voices.ts, in Node, with the same
// engine code the browser worker uses. Downloads the models from Hugging Face once into
// .cache/tts/. Usage: npm run tts:samples [-- voice-id ...]
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { createSynthesizer, toWav } from "../web/src/lib/tts/engine.ts";
import { createPhonemizer, type PhonemizeFactory } from "../web/src/lib/tts/phonemize.ts";
import { VOICES } from "../web/src/lib/tts/voices.ts";
import type { OrtLike } from "../web/src/lib/tts/piper.ts";
import { SAMPLE_TEXT } from "./tts-text.mts";

const require = createRequire(import.meta.url);
const root = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const cache = join(root, ".cache", "tts");
const out = join(root, "tts-samples");
mkdirSync(cache, { recursive: true });
mkdirSync(out, { recursive: true });

async function loadBytes(url: string): Promise<ArrayBuffer> {
  const f = join(cache, createHash("sha1").update(url).digest("hex").slice(0, 16) + "-" + url.split("/").pop());
  if (!existsSync(f)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    writeFileSync(f, Buffer.from(await res.arrayBuffer()));
  }
  const b = readFileSync(f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

const pw = dirname(require.resolve("@diffusionstudio/piper-wasm/build/piper_phonemize.js"));
const file = (p: string) => { const b = readFileSync(join(pw, p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };

const synth = createSynthesizer({
  kokoroDevice: "cpu",
  loadBytes,
  phonemize: async () => createPhonemizer({ factory: require(join(pw, "piper_phonemize.js")) as PhonemizeFactory, wasm: file("piper_phonemize.wasm"), data: file("piper_phonemize.data") }),
  piperOrt: async () => require("onnxruntime-node") as OrtLike,
});



const only = process.argv.slice(2);
for (const v of VOICES.filter((x) => !only.length || only.includes(x.id))) {
  const t0 = Date.now();
  const parts: Float32Array[] = [];
  let rate = 22050;
  for await (const a of synth.stream(v, SAMPLE_TEXT[v.lang])) { parts.push(a.pcm, new Float32Array(Math.round(a.sampleRate * 0.25))); rate = a.sampleRate; }
  const pcm = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { pcm.set(p, o); o += p.length; }
  writeFileSync(join(out, `${v.id}.wav`), toWav(pcm, rate));
  console.log(`${v.id}: ${(pcm.length / rate).toFixed(1)} s of audio in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
