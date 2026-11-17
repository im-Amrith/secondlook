// Page side of read-aloud: talks to the TTS worker, plays audio, and falls back to the browser's
// own voices. Only voices that run locally (`localService`) are used for the fallback, because
// some browsers' network voices (e.g. Chrome's "Google हिन्दी") send the text to a server.
import { DEFAULT_VOICE, VOICES, voiceById, voiceFiles, type TtsLang, type VoiceInfo } from "./voices";
import { VOICE_CACHE, type WorkerIn, type WorkerOut } from "./protocol";

export type SpeakMode = "neural" | "system";

export interface DownloadProgress {
  loaded: number;
  total: number;
}

/** Shared espeak-ng data + runtime downloaded with the first neural voice. */
export const SHARED_DOWNLOAD_MB = 30;

/** Which language a piece of text is in, by script. */
export function detectLang(text: string): TtsLang {
  const deva = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  const mal = (text.match(/[ഀ-ൿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (mal > deva && mal >= latin * 0.3) return "ml";
  if (deva >= latin * 0.3 && deva > 0) return "hi";
  return "en";
}

const BCP47: Record<TtsLang, string> = { en: "en", hi: "hi", ml: "ml" };

export function systemVoiceFor(lang: TtsLang): SpeechSynthesisVoice | undefined {
  if (typeof speechSynthesis === "undefined") return undefined;
  const voices = speechSynthesis.getVoices().filter((v) => v.localService && v.lang.toLowerCase().startsWith(BCP47[lang]));
  return voices.find((v) => v.default) ?? voices.find((v) => /IN$/i.test(v.lang)) ?? voices[0];
}

/** Are all of this voice's files in the browser cache? */
export async function isDownloaded(v: VoiceInfo): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const c = await caches.open(VOICE_CACHE);
    const hits = await Promise.all(voiceFiles(v).map((u) => c.match(u)));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}

/** Remove a voice's files. */
export async function deleteVoice(v: VoiceInfo): Promise<void> {
  if (typeof caches === "undefined") return;
  const c = await caches.open(VOICE_CACHE);
  await Promise.all(voiceFiles(v).map((u) => c.delete(u)));
}

type Listener = (state: SpeakerState) => void;
export interface SpeakerState {
  speaking: boolean;
  /** 0..1 while a voice downloads, else null. */
  progress: number | null;
  error: string | null;
}

class Speaker {
  private worker: Worker | null = null;
  private seq = 0;
  private active = 0;
  private ctx: AudioContext | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private listeners = new Set<Listener>();
  private handlers = new Map<number, (m: WorkerOut) => void>();
  state: SpeakerState = { speaking: false, progress: null, error: null };

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  private set(patch: Partial<SpeakerState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./tts.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e: MessageEvent<WorkerOut>) => this.handlers.get(e.data.id)?.(e.data);
    }
    return this.worker;
  }

  private send(msg: WorkerIn, onMsg: (m: WorkerOut) => void) {
    this.handlers.set(msg.id, onMsg);
    this.getWorker().postMessage(msg);
  }

  /** Download (if needed) and load a neural voice. Reports progress through the state. */
  prepare(v: VoiceInfo): Promise<void> {
    const id = ++this.seq;
    this.set({ progress: 0, error: null });
    const files = new Map<string, DownloadProgress>();
    return new Promise((resolve, reject) => {
      this.send({ id, type: "prepare", voiceId: v.id }, (m) => {
        if (m.type === "progress") {
          files.set(m.file, { loaded: m.loaded, total: m.total });
          const all = [...files.values()];
          const total = all.reduce((n, f) => n + f.total, 0);
          this.set({ progress: total ? all.reduce((n, f) => n + f.loaded, 0) / total : 0 });
        } else if (m.type === "done") {
          this.handlers.delete(id);
          this.set({ progress: null });
          resolve();
        } else if (m.type === "error") {
          this.handlers.delete(id);
          this.set({ progress: null, error: m.message });
          reject(new Error(m.message));
        }
      });
    });
  }

  stop() {
    if (this.active) this.getWorker().postMessage({ id: this.active, type: "cancel" } satisfies WorkerIn);
    this.active = 0;
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    this.sources = [];
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    this.set({ speaking: false });
  }

  /** Speak with a downloaded neural voice. Playback starts after the first sentence is ready. */
  speakNeural(v: VoiceInfo, text: string, speed = 1): Promise<void> {
    this.stop();
    const id = ++this.seq;
    this.active = id;
    this.ctx ??= new AudioContext();
    const ctx = this.ctx;
    void ctx.resume();
    let at = ctx.currentTime + 0.05;
    let pending = 0;
    let finished = false;
    this.set({ speaking: true, error: null });
    return new Promise((resolve, reject) => {
      const maybeEnd = () => {
        if (finished && pending === 0 && this.active === id) {
          this.active = 0;
          this.set({ speaking: false });
          resolve();
        }
      };
      this.send({ id, type: "speak", voiceId: v.id, text, speed }, (m) => {
        if (this.active !== id) return;
        if (m.type === "chunk") {
          const buf = ctx.createBuffer(1, m.pcm.length, m.sampleRate);
          buf.copyToChannel(new Float32Array(m.pcm), 0);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          at = Math.max(at, ctx.currentTime + 0.02);
          src.start(at);
          at += buf.duration + 0.18;
          pending++;
          this.sources.push(src);
          src.onended = () => {
            pending--;
            maybeEnd();
          };
        } else if (m.type === "done") {
          this.handlers.delete(id);
          finished = true;
          maybeEnd();
        } else if (m.type === "error") {
          this.handlers.delete(id);
          this.active = 0;
          this.set({ speaking: false, error: m.message });
          reject(new Error(m.message));
        }
      });
    });
  }

  /** Speak with the browser's own on-device voice. */
  speakSystem(voice: SpeechSynthesisVoice, text: string, speed = 1): Promise<void> {
    this.stop();
    this.set({ speaking: true, error: null });
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.9 * speed;
      u.onend = u.onerror = () => {
        this.set({ speaking: false });
        resolve();
      };
      speechSynthesis.speak(u);
    });
  }
}

let instance: Speaker | null = null;
export function speaker(): Speaker {
  return (instance ??= new Speaker());
}

/** The neural voice chosen for a language (or the default). */
export function chosenVoice(lang: TtsLang, choice: Partial<Record<TtsLang, string>> | undefined): VoiceInfo {
  return voiceById(choice?.[lang]) ?? voiceById(DEFAULT_VOICE[lang])!;
}
