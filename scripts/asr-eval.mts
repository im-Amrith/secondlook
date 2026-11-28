// Speech-recognition check for Call Guard: does it still catch a scam call when the call is in
// Hindi or Malayalam? Each demo scam call (web/src/lib/listen.ts) is spoken by a Piper voice,
// transcribed by an open Whisper model in 6-second pieces (as the browser does), and fed through
// the Call Guard rules. We report character error rate, speed and whether it reached "high risk".
// Usage: npm run asr:eval [-- model-id ...]   (writes evals/ASR.md when run with no arguments)
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { pipeline } from "@huggingface/transformers";
import { addTranscript, createCallState } from "../shared/src/index.ts";
import { createSynthesizer } from "../web/src/lib/tts/engine.ts";
import { createPhonemizer, type PhonemizeFactory } from "../web/src/lib/tts/phonemize.ts";
import { voiceById } from "../web/src/lib/tts/voices.ts";
import type { OrtLike } from "../web/src/lib/tts/piper.ts";
import { DEMO_CALL } from "../web/src/lib/listen.ts";
import { fixScript } from "../web/src/lib/asr-text.ts";

const require = createRequire(import.meta.url);
const root = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const cache = join(root, ".cache", "tts");
mkdirSync(cache, { recursive: true });

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
  device: "cpu",
  loadBytes,
  phonemize: async () => createPhonemizer({ factory: require(join(pw, "piper_phonemize.js")) as PhonemizeFactory, wasm: file("piper_phonemize.wasm"), data: file("piper_phonemize.data") }),
  piperOrt: async () => require("onnxruntime-node") as OrtLike,
});

function resample(pcm: Float32Array, from: number, to = 16000): Float32Array {
  const out = new Float32Array(Math.floor((pcm.length * to) / from));
  for (let i = 0; i < out.length; i++) {
    const x = (i * from) / to, j = Math.floor(x), f = x - j;
    out[i] = (pcm[j] ?? 0) * (1 - f) + (pcm[j + 1] ?? 0) * f;
  }
  return out;
}
const norm = (s: string) => s.toLowerCase().normalize("NFC").replace(/[\p{P}\p{S}]/gu, "").replace(/\s+/g, " ").trim();
function cer(ref: string, hyp: string): number {
  const a = [...norm(ref)], b = [...norm(hyp)];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length]! / a.length;
}

const VOICE = { en: "piper-en-ljspeech", hi: "piper-hi-priyamvada", ml: "piper-ml-meera" } as const;
const LANG = { en: "english", hi: "hindi", ml: "malayalam" } as const;
const CHUNK = 16000 * 6;

// Speak each demo call once.
const calls: Record<string, { pcm: Float32Array; text: string }> = {};
for (const lang of ["en", "hi", "ml"] as const) {
  const v = voiceById(VOICE[lang])!;
  const parts: Float32Array[] = [];
  for (const line of DEMO_CALL[lang]) {
    for await (const a of synth.stream(v, line)) parts.push(resample(a.pcm, a.sampleRate), new Float32Array(16000 * 0.4));
  }
  const pcm = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { pcm.set(p, o); o += p.length; }
  calls[lang] = { pcm, text: DEMO_CALL[lang].join(" ") };
}

// "model[:langs]" e.g. onnx-community/whisper-hindi-small-ONNX:hi
const specs = process.argv.slice(2).length ? process.argv.slice(2) : ["onnx-community/whisper-base", "onnx-community/whisper-hindi-small-ONNX:hi", "onnx-community/whisper-small:ml", "onnx-community/whisper-small:ml:translate"];
const rows: string[] = [];
async function load(model: string) {
  // Hugging Face downloads can drop on slow connections; retry a few times.
  for (let i = 0; ; i++) {
    try {
      return await pipeline("automatic-speech-recognition", model, { dtype: { encoder_model: "q8", decoder_model_merged: "q8" } as never, device: "cpu" });
    } catch (e) {
      if (i >= 3) throw e;
      console.error(`retrying ${model}: ${e instanceof Error ? e.message : e}`);
    }
  }
}
for (const spec of specs) {
  // "model:langs[:translate]": translate = Whisper's speech-to-English task.
  const [model, langList, mode] = spec.split(":") as [string, string | undefined, string | undefined];
  const task = mode === "translate" ? "translate" : "transcribe";
  const langs = (langList ? langList.split(",") : ["en", "hi", "ml"]) as ("en" | "hi" | "ml")[];
  const asr = await load(model);
  for (const lang of langs) {
    const { pcm, text } = calls[lang]!;
    const t0 = performance.now();
    let state = createCallState();
    const heard: string[] = [];
    for (let i = 0; i < pcm.length; i += CHUNK) {
      // Single-language fine-tunes (e.g. whisper-hindi-small) reject a language option.
      const opts = /hindi/i.test(model) ? {} : { language: LANG[lang], task, no_repeat_ngram_size: 3 };
      const out = (await asr(pcm.subarray(i, i + CHUNK), opts as never)) as { text: string };
      const t = fixScript(out.text, lang).trim();
      heard.push(t);
      state = addTranscript(state, t, i);
    }
    const secs = (performance.now() - t0) / 1000;
    const audio = pcm.length / 16000;
    const c = cer(text, heard.join(" "));
    console.log(model, task, lang, `CER ${(c * 100).toFixed(1)}%`, `RTF ${(secs / audio).toFixed(2)}`, state.level, state.signals.map((s) => s.ruleId).join(","), "|", heard.join(" / "));
    rows.push(`| \`${model.split("/")[1]}\`${task === "translate" ? " (translate to English)" : ""} | ${lang} | ${(c * 100).toFixed(1)}% | ${(secs / audio).toFixed(2)} | **${state.level}** | ${state.signals.map((s) => s.ruleId).join(", ")} |`);
  }
}

if (process.argv.length <= 2) {
  writeFileSync(join(root, "evals", "ASR.md"), `# Call Guard speech recognition

Does Call Guard still catch a scam call in Hindi and Malayalam? Each made-up demo call (\`DEMO_CALL\` in \`web/src/lib/listen.ts\`) is spoken by a Piper voice, cut into 6-second pieces like the browser does, transcribed by an open Whisper model (q8, ONNX, CPU in Node), and fed through the Call Guard rules (\`shared/src/call.ts\`). **Risk** is what Call Guard ended on. CER is the character error rate against the script (lower is better); RTF is processing time ÷ audio length on this laptop's CPU (below 1 keeps up with the call; the browser is similar on WASM and much faster with WebGPU).

Synthetic speech is cleaner than a real phone on speaker, so treat these as a best case. Regenerate: \`npm run asr:eval\`.

| Model | Lang | CER | RTF (CPU) | Risk | Signals heard |
| --- | --- | --- | --- | --- | --- |
${rows.join("\n")}
`);
}
