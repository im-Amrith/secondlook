// Intelligibility check for the TTS voices: transcribe each sample from `npm run tts:samples`
// with Whisper large-v3-turbo (open, multilingual) and report the character error rate against
// the text that was spoken. Lower is better. It measures "can a listener make out the words",
// not naturalness. Usage: npm run tts:eval  (writes evals/TTS.md)
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { pipeline } from "@huggingface/transformers";
import { VOICES } from "../web/src/lib/tts/voices.ts";
import { SAMPLE_TEXT } from "./tts-text.mts";

const root = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const LANG = { en: "english", hi: "hindi", ml: "malayalam" } as const;

function readWav(path: string): { pcm: Float32Array; rate: number } {
  const b = readFileSync(path);
  const rate = b.readUInt32LE(24);
  const n = (b.length - 44) / 2;
  const pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) pcm[i] = b.readInt16LE(44 + i * 2) / 0x8000;
  return { pcm, rate };
}
function resample(pcm: Float32Array, from: number, to = 16000): Float32Array {
  const out = new Float32Array(Math.floor((pcm.length * to) / from));
  for (let i = 0; i < out.length; i++) {
    const x = (i * from) / to, j = Math.floor(x), f = x - j;
    out[i] = (pcm[j] ?? 0) * (1 - f) + (pcm[j + 1] ?? 0) * f;
  }
  return out;
}
/**
 * Whisper often writes Malayalam speech in Devanagari letters. The Indic Unicode blocks are laid
 * out in parallel (ISCII order), so shift those letters into the Malayalam block before scoring.
 * Approximate (a few letters differ), but far better than comparing two scripts.
 */
const toMalayalam = (s: string) => s.replace(/[ऀ-ॿ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x400));
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

const asr = await pipeline("automatic-speech-recognition", "onnx-community/whisper-large-v3-turbo", { dtype: { encoder_model: "q8", decoder_model_merged: "q8" } as never, device: "cpu" });
const rows: string[] = [];
for (const v of VOICES) {
  const { pcm, rate } = readWav(join(root, "tts-samples", `${v.id}.wav`));
  const out = (await asr(resample(pcm, rate), { language: LANG[v.lang], task: "transcribe", chunk_length_s: 30 } as never)) as { text: string };
  const heard = v.lang === "ml" ? toMalayalam(out.text) : out.text;
  const c = cer(SAMPLE_TEXT[v.lang], heard);
  console.log(v.id, (c * 100).toFixed(1) + "%", heard.trim());
  rows.push(`| ${v.lang} | \`${v.id}\` | ${v.engine === "kokoro" ? "Kokoro-82M" : "Piper medium"} | ${v.sizeMB} MB | ${v.licence} | **${(c * 100).toFixed(1)}%** | ${heard.trim().replace(/\|/g, "/")} |`);
}
writeFileSync(join(root, "evals", "TTS.md"), `# Read-aloud voices: intelligibility check

Each voice speaks a short scam warning (\`scripts/tts-text.mts\`); Whisper large-v3-turbo (q8, open) transcribes it back and we report the **character error rate** (CER) against the original text, after removing punctuation. Lower is better. It measures whether the words come through, not how natural the voice sounds, and Whisper's own errors are included. Whisper writes Malayalam speech in Devanagari, so for Malayalam the letters are shifted back into the Malayalam block first (approximate). Numbers read out as words (\"एक हजार...\" for 1930) count as errors.

Regenerate: \`npm run tts:samples && npm run tts:eval\`.

| Lang | Voice | Model | Download | Licence | CER | Whisper heard |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Speed in the browser

What decides the default for an older person is how long they wait for the first word. Measured in Chrome (the Claude desktop app's browser pane) on a Windows laptop, ONNX Runtime Web on **one WASM thread** (the app isn't cross-origin isolated; turning that on would break Firebase's sign-in popup), voices already downloaded:

| Voice | Audio | Time to make it | Real-time factor |
| --- | --- | --- | --- |
| Piper \`piper-hi-rohan\` | 3.8 s | 1.0 s | **0.27** (about 4x faster than real time) |
| Piper \`piper-ml-meera\` | 3.3 s | 1.8 s (first call, includes warm-up) | 0.55 |
| Kokoro \`kokoro-hi-alpha\` | 8.3 s | 21.8 s | **2.6** (slower than real time) |
| Kokoro \`kokoro-en-heart\` | 6.2 s | 60.9 s (worker still busy with an earlier long text) | up to 9.9 |

So the defaults are Piper (\`DEFAULT_VOICE\` in \`web/src/lib/tts/voices.ts\`): LJ Speech for English, Priyamvada for Hindi, Meera for Malayalam, picked by the CER above. Kokoro stays in Settings as the most natural option for people with a fast computer. The first chunk is one short sentence, so speech starts while the rest is being made.

First use downloads the voice (60 MB Piper / 93 MB Kokoro) plus about 30 MB of shared speech data (espeak-ng phonemizer data and the ONNX Runtime WASM). In the test the Hindi voice started speaking 33 s after the click, download included.

Licences: Kokoro-82M is Apache-2.0. Piper's code is MIT and the English voices are trained on public-domain data, but the **Hindi and Malayalam Piper voices are trained on non-commercial datasets**; a commercial release would need Kokoro Hindi (Apache-2.0, slower) or a licensed Malayalam voice.
`);
