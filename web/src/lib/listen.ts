// Turning the sound of a call into text, ON THIS DEVICE ONLY. A live call is about the most
// private thing there is, so there is deliberately no cloud path here: if neither on-device
// engine is available, the Call Guard falls back to tap-to-answer questions.
//
// Engines, best first:
//  1. "speech": Chrome's Web Speech API with processLocally = true (on-device speech recognition,
//     Chrome 139+). Streams words as they are spoken. Without processLocally, Chrome's
//     SpeechRecognition sends audio to Google's servers, so we never start it unless the browser
//     confirms it will run locally.
//  2. "nano": Gemini Nano with audio input through Chrome's Prompt API, a few seconds at a time.
//     Firebase AI Logic 13.3's on-device adapter turns every inlineData part into an image, so
//     audio can't go through the SDK yet; we call the Prompt API directly, which is on-device by
//     definition (no network path exists).
//  3. "whisper": an open Whisper model from Hugging Face, run by Transformers.js in a Web Worker
//     (WebGPU when available, else WASM). Chrome's on-device speech packs are English-only today,
//     so this is what makes Hindi and Malayalam calls work. One-time model download, with consent.
//  4. "demo": a scripted call for demos and tests (no microphone). Clearly labelled in the UI.
import type { TtsLang } from "./tts/voices";
import { ASR_MODELS, type AsrIn, type AsrOut } from "./asr/protocol";
import { fixScript } from "./asr-text";

export type ListenEngine = "speech" | "whisper" | "nano" | "demo";
export type EngineStatus = "available" | "downloadable" | "downloading" | "unavailable" | "unsupported";

export interface ListenHandlers {
  /** Final (not interim) recognised text. */
  onText: (text: string) => void;
  /** Words recognised so far for the current phrase (may change). */
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
  /** Rough microphone level 0..1, for a "we can hear you" meter. */
  onLevel?: (level: number) => void;
  /** The source finished by itself (only the demo does). */
  onEnd?: () => void;
}

export interface Listening {
  stop(): void;
}

const SPEECH_LANG: Record<TtsLang, string> = { en: "en-IN", hi: "hi-IN", ml: "ml-IN" };
/** Fallback BCP-47 tags to try when the regional variant has no on-device pack. */
const SPEECH_FALLBACK: Record<TtsLang, string[]> = { en: ["en-IN", "en-US", "en-GB"], hi: ["hi-IN"], ml: ["ml-IN"] };

// ---- 1. on-device Web Speech ---------------------------------------------------------------

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionStatic {
  new (): SpeechRecognitionLike;
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (o: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
}

function speechCtor(): SpeechRecognitionStatic | null {
  const g = globalThis as unknown as { SpeechRecognition?: SpeechRecognitionStatic; webkitSpeechRecognition?: SpeechRecognitionStatic };
  const C = g.SpeechRecognition ?? g.webkitSpeechRecognition;
  // Only the newer API with on-device support counts. Without `available`, we can't be sure the
  // audio would stay on this device.
  return C && typeof C.available === "function" ? C : null;
}

/** On-device speech status for a language, plus the exact tag that works. */
export async function speechStatus(lang: TtsLang): Promise<{ status: EngineStatus; tag: string }> {
  const C = speechCtor();
  if (!C) return { status: "unsupported", tag: SPEECH_LANG[lang] };
  let best: { status: EngineStatus; tag: string } = { status: "unavailable", tag: SPEECH_LANG[lang] };
  for (const tag of SPEECH_FALLBACK[lang]) {
    try {
      const s = (await C.available!({ langs: [tag], processLocally: true })) as EngineStatus;
      if (s === "available") return { status: s, tag };
      if ((s === "downloadable" || s === "downloading") && best.status === "unavailable") best = { status: s, tag };
    } catch {
      /* try the next tag */
    }
  }
  return best;
}

/** Download the on-device speech pack. Must be called from a click. */
export async function installSpeech(tag: string): Promise<boolean> {
  const C = speechCtor();
  if (!C?.install) return false;
  try {
    return await C.install({ langs: [tag], processLocally: true });
  } catch {
    return false;
  }
}

export function startSpeech(tag: string, h: ListenHandlers): Listening {
  const C = speechCtor();
  if (!C) throw new Error("On-device speech recognition isn't available.");
  let stopped = false;
  let rec: SpeechRecognitionLike | null = null;
  let restarts = 0;

  const begin = () => {
    const r = new C();
    r.lang = tag;
    r.continuous = true;
    r.interimResults = true;
    r.processLocally = true;
    // Privacy guard: if the browser ignored processLocally, don't start (audio would go to a server).
    if (r.processLocally !== true) {
      h.onError?.("This browser can't keep speech recognition on the device, so listening is off.");
      stopped = true;
      return;
    }
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        const text = res[0].transcript;
        if (res.isFinal) h.onText(text);
        else interim += text;
      }
      h.onInterim?.(interim);
      restarts = 0;
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        stopped = true;
        h.onError?.("The microphone isn't allowed. Allow it in the address bar, or use the questions below.");
        return;
      }
      h.onError?.(`Listening stopped (${e.error}).`);
    };
    // Recognition ends on long silences; keep going until the person presses Stop.
    r.onend = () => {
      if (stopped) return;
      if (++restarts > 20) {
        h.onError?.("Listening keeps stopping. Use the questions below instead.");
        return;
      }
      setTimeout(() => !stopped && begin(), 250);
    };
    rec = r;
    r.start();
  };
  begin();
  return {
    stop() {
      stopped = true;
      try {
        rec?.abort();
      } catch {
        /* already stopped */
      }
    },
  };
}

// ---- 2. Gemini Nano audio (Prompt API) -----------------------------------------------------

interface LMSession {
  prompt(input: unknown, opts?: { signal?: AbortSignal }): Promise<string>;
  clone(): Promise<LMSession>;
  destroy(): void;
}
interface LMStatic {
  availability(o: object): Promise<string>;
  create(o: object): Promise<LMSession>;
}

const NANO_AUDIO_OPTIONS = {
  expectedInputs: [{ type: "audio" as const }, { type: "text" as const, languages: ["en"] }],
  expectedOutputs: [{ type: "text" as const, languages: ["en"] }],
};

const TRANSCRIBE_SYSTEM =
  "You transcribe short pieces of a phone call. Output only the words that were spoken, nothing else. " +
  "If the speech is in Hindi or Malayalam, write it in English letters (for example: 'aap digital arrest mein hain'). " +
  "If nothing is spoken, output nothing.";

function lm(): LMStatic | null {
  const g = globalThis as unknown as { LanguageModel?: LMStatic };
  return g.LanguageModel && typeof g.LanguageModel.availability === "function" ? g.LanguageModel : null;
}

export async function nanoAudioStatus(): Promise<EngineStatus> {
  const L = lm();
  if (!L) return "unsupported";
  try {
    return (await L.availability(NANO_AUDIO_OPTIONS)) as EngineStatus;
  } catch {
    return "unavailable";
  }
}

/** Seconds of audio per transcription. Shorter reacts faster; longer gives the model more context. */
const CHUNK_SECONDS = 6;

export async function startNanoAudio(stream: MediaStream, h: ListenHandlers): Promise<Listening> {
  const L = lm();
  if (!L) throw new Error("Gemini Nano isn't available in this browser.");
  const base = await L.create({ ...NANO_AUDIO_OPTIONS, initialPrompts: [{ role: "system", content: TRANSCRIBE_SYSTEM }] });
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  // ScriptProcessor is deprecated but universally available and fine for ~6 s chunks.
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const rate = ctx.sampleRate;
  let parts: Float32Array[] = [];
  let collected = 0;
  let energy = 0;
  let busy = false;
  let stopped = false;
  const abort = new AbortController();

  const flush = async (pcm: Float32Array<ArrayBuffer>, loud: boolean) => {
    if (!loud || busy || stopped) return; // skip silence; drop a chunk rather than queue behind a slow one
    busy = true;
    try {
      const buf = ctx.createBuffer(1, pcm.length, rate);
      buf.copyToChannel(pcm, 0);
      const s = await base.clone();
      const text = await s.prompt(
        [{ role: "user", content: [{ type: "text", value: "Transcribe this audio." }, { type: "audio", value: buf }] }],
        { signal: abort.signal },
      );
      s.destroy();
      if (!stopped && text.trim()) h.onText(text.trim());
    } catch (e) {
      if (!stopped) h.onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      busy = false;
    }
  };

  proc.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < input.length; i++) sum += input[i]! * input[i]!;
    const rms = Math.sqrt(sum / input.length);
    h.onLevel?.(Math.min(1, rms * 8));
    energy += rms;
    parts.push(new Float32Array(input));
    collected += input.length;
    if (collected >= rate * CHUNK_SECONDS) {
      const pcm = new Float32Array(collected);
      let o = 0;
      for (const p of parts) {
        pcm.set(p, o);
        o += p.length;
      }
      const loud = energy / parts.length > 0.01;
      parts = [];
      collected = 0;
      energy = 0;
      void flush(pcm, loud);
    }
  };
  src.connect(proc);
  // ScriptProcessor only runs while connected to the destination; route it through a muted gain.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  proc.connect(mute);
  mute.connect(ctx.destination);

  return {
    stop() {
      stopped = true;
      abort.abort();
      proc.disconnect();
      src.disconnect();
      void ctx.close();
      base.destroy();
    },
  };
}

// ---- 3. Whisper in a worker (Transformers.js) ------------------------------------------------

let asrWorker: Worker | null = null;
let asrSeq = 0;
const asrWaiters = new Map<number, (m: AsrOut) => void>();
const asrReady = new Map<TtsLang, Promise<"webgpu" | "wasm">>();

function asr(): Worker {
  if (!asrWorker) {
    asrWorker = new Worker(new URL("./asr/asr.worker.ts", import.meta.url), { type: "module" });
    asrWorker.onmessage = (e: MessageEvent<AsrOut>) => asrWaiters.get(e.data.id)?.(e.data);
  }
  return asrWorker;
}

type AsrRequest = { type: "load"; lang: TtsLang } | { type: "transcribe"; pcm: Float32Array; lang: TtsLang };

function ask(msg: AsrRequest, onProgress?: (p: number) => void): Promise<AsrOut> {
  const id = ++asrSeq;
  return new Promise((resolve) => {
    asrWaiters.set(id, (m) => {
      if (m.type === "progress") return onProgress?.(m.total ? m.loaded / m.total : 0);
      asrWaiters.delete(id);
      resolve(m);
    });
    asr().postMessage({ ...msg, id } as AsrIn, msg.type === "transcribe" ? [msg.pcm.buffer] : []);
  });
}

/** Is this language's Whisper model already in the browser cache (no download needed)? */
export async function whisperDownloaded(lang: TtsLang): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const c = await caches.open("transformers-cache");
    const keys = await c.keys();
    const id = ASR_MODELS[lang].id;
    return keys.filter((r) => r.url.includes(`/${id}/`) && r.url.endsWith(".onnx")).length >= 2;
  } catch {
    return false;
  }
}

/** Whisper runs anywhere Web Workers and WebAssembly do. */
export function whisperSupported(): boolean {
  return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
}

/** Download (first time) and load the model for a language. Resolves with the device it runs on. */
export function prepareWhisper(lang: TtsLang, onProgress?: (p: number) => void): Promise<"webgpu" | "wasm"> {
  let p = asrReady.get(lang);
  if (!p) {
    p = ask({ type: "load", lang }, onProgress).then((m) => {
      if (m.type === "ready") return m.device;
      throw new Error(m.type === "error" ? m.message : "The listening model didn't load.");
    });
    // The worker keeps one model at a time; forget the others so they reload when needed.
    asrReady.clear();
    asrReady.set(lang, p);
    p.catch(() => asrReady.delete(lang));
  }
  return p;
}

/** Seconds per piece sent to Whisper (it reads up to 30 s; short pieces keep warnings quick). */
const WHISPER_CHUNK_SECONDS = 5;

export async function startWhisper(stream: MediaStream, lang: TtsLang, h: ListenHandlers): Promise<Listening> {
  await prepareWhisper(lang);
  // Whisper wants 16 kHz mono; let the browser resample.
  const ctx = new AudioContext({ sampleRate: 16000 });
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  let parts: Float32Array[] = [];
  let collected = 0;
  let loudBlocks = 0;
  let busy = false;
  let stopped = false;
  let pending: Float32Array | null = null;

  const send = async (pcm: Float32Array) => {
    busy = true;
    try {
      const m = await ask({ type: "transcribe", pcm, lang });
      if (stopped) return;
      if (m.type === "text") {
        const t = fixScript(m.text, lang).trim();
        if (t) h.onText(t);
      } else if (m.type === "error") h.onError?.(m.message);
    } finally {
      busy = false;
      // If speech arrived while we were busy, send it now (merged, never more than ~15 s).
      if (pending && !stopped) {
        const next = pending;
        pending = null;
        void send(next);
      }
    }
  };

  proc.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < input.length; i++) sum += input[i]! * input[i]!;
    const rms = Math.sqrt(sum / input.length);
    h.onLevel?.(Math.min(1, rms * 8));
    if (rms > 0.01) loudBlocks++;
    parts.push(new Float32Array(input));
    collected += input.length;
    if (collected < 16000 * WHISPER_CHUNK_SECONDS) return;
    const pcm = new Float32Array(collected);
    let o = 0;
    for (const p of parts) {
      pcm.set(p, o);
      o += p.length;
    }
    const speech = loudBlocks >= 3; // skip silence: Whisper invents words when given none
    parts = [];
    collected = 0;
    loudBlocks = 0;
    if (!speech) return;
    if (!busy) void send(pcm);
    else {
      const merged = pending ? new Float32Array(pending.length + pcm.length) : pcm;
      if (pending) {
        merged.set(pending);
        merged.set(pcm, pending.length);
      }
      pending = merged.length > 16000 * 15 ? merged.subarray(merged.length - 16000 * 15) : merged;
    }
  };
  src.connect(proc);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  proc.connect(mute);
  mute.connect(ctx.destination);

  return {
    stop() {
      stopped = true;
      proc.disconnect();
      src.disconnect();
      void ctx.close();
    },
  };
}

// ---- microphone level (shared) -------------------------------------------------------------

/** Ask for the microphone. Audio stays in this tab. */
export async function openMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
}

/** Level meter for the speech engine (which manages its own capture). */
export function watchLevel(stream: MediaStream, onLevel: (l: number) => void): () => void {
  const ctx = new AudioContext();
  const an = ctx.createAnalyser();
  an.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(an);
  const data = new Float32Array(an.fftSize);
  let raf = 0;
  const tick = () => {
    an.getFloatTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += v * v;
    onLevel(Math.min(1, Math.sqrt(sum / data.length) * 8));
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => {
    cancelAnimationFrame(raf);
    void ctx.close();
  };
}

// ---- 4. scripted demo call -------------------------------------------------------------------

export const DEMO_CALL: Record<TtsLang, string[]> = {
  en: [
    "Hello, am I speaking with Mr Menon?",
    "This is Inspector Vikram Rathore from the Mumbai Cyber Crime branch.",
    "A parcel booked in your name was seized at customs. It had drugs and five fake passports.",
    "Your Aadhaar is linked to a money laundering case. There is an arrest warrant against you.",
    "From now you are under digital arrest. Keep your camera on and stay on this video call.",
    "Do not tell your family or anyone about this. It is a confidential investigation.",
    "To prove you are innocent, transfer your savings to the RBI verification account.",
    "The money will be returned after the verification. You must do it within thirty minutes.",
  ],
  hi: [
    "नमस्ते, क्या मैं मेनन जी से बात कर रहा हूँ?",
    "मैं मुंबई साइबर क्राइम से इंस्पेक्टर विक्रम राठौर बोल रहा हूँ।",
    "आपके नाम का एक पार्सल कस्टम में पकड़ा गया है, उसमें ड्रग्स हैं।",
    "आपका आधार मनी लॉन्ड्रिंग केस से जुड़ा है। आपके खिलाफ गिरफ्तार वारंट है।",
    "अब आप डिजिटल अरेस्ट में हैं। कैमरा ऑन रखिए और वीडियो कॉल पर ही रहिए।",
    "किसी को मत बताना, परिवार को भी नहीं।",
    "अपनी बेगुनाही साबित करने के लिए अपने पैसे आरबीआई के खाते में भेजिए।",
    "तुरंत कीजिए, वरना आपको जेल जाना पड़ेगा।",
  ],
  ml: [
    "ഹലോ, മേനോൻ സാറല്ലേ?",
    "ഞാൻ മുംബൈ സൈബർ ക്രൈമിൽ നിന്ന് ഇൻസ്പെക്ടർ വിക്രം ആണ്.",
    "നിങ്ങളുടെ പേരിലുള്ള ഒരു പാർസൽ കസ്റ്റംസ് പിടിച്ചു. അതിൽ മയക്കുമരുന്ന് ഉണ്ട്.",
    "നിങ്ങൾക്കെതിരെ അറസ്റ്റ് വാറന്റ് ഉണ്ട്. ഇപ്പോൾ നിങ്ങൾ ഡിജിറ്റൽ അറസ്റ്റിലാണ്.",
    "ഫോൺ കട്ട് ചെയ്യരുത്. ഇത് ആരോടും പറയരുത്.",
    "നിങ്ങളുടെ പണം RBI verification account-ലേക്ക് transfer ചെയ്യണം. Immediately.",
  ],
};

export function startDemo(lang: TtsLang, h: ListenHandlers, everyMs = 2600): Listening {
  const lines = DEMO_CALL[lang];
  let i = 0;
  const timer = setInterval(() => {
    h.onText(lines[i++]!);
    if (i >= lines.length) {
      clearInterval(timer);
      h.onEnd?.();
    }
  }, everyMs);
  return { stop: () => clearInterval(timer) };
}
