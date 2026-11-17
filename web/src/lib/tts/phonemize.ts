// Text → phonemes with espeak-ng, compiled to WASM by the piper_phonemize project
// (@diffusionstudio/piper-wasm, MIT wrapper; espeak-ng itself is GPL-3.0 and is loaded at runtime,
// not compiled into SecondLook). The bundled espeak data covers English, Hindi and Malayalam.

export interface Phonemes {
  /** IPA symbols, one per entry (what Kokoro's tokenizer reads). */
  phonemes: string[];
  /** Piper phoneme ids, already padded for VITS. */
  ids: number[];
}

/** Emscripten factory exported by piper_phonemize.js. */
export type PhonemizeFactory = (module: Record<string, unknown>) => Promise<{ callMain(args: string[]): void }>;

export interface PhonemizerDeps {
  factory: PhonemizeFactory;
  /** piper_phonemize.wasm bytes. */
  wasm: ArrayBuffer;
  /** piper_phonemize.data bytes (espeak-ng-data). */
  data: ArrayBuffer;
}

export type Phonemizer = (text: string, espeakVoice: string) => Promise<Phonemes>;

export function createPhonemizer({ factory, wasm, data }: PhonemizerDeps): Phonemizer {
  // The program calls exit() after each run, so each call gets a fresh module instance, fed from
  // the bytes already in memory (no refetch).
  return (text, voice) =>
    new Promise<Phonemes>((resolve, reject) => {
      let done = false;
      factory({
        wasmBinary: wasm,
        getPreloadedPackage: () => data,
        locateFile: (f: string) => f,
        print: (line: string) => {
          if (done) return;
          try {
            const out = JSON.parse(line) as { phoneme_ids: number[]; phonemes: string[] };
            done = true;
            resolve({ ids: out.phoneme_ids, phonemes: out.phonemes });
          } catch {
            /* not our JSON line */
          }
        },
        printErr: (msg: string) => {
          if (!done && /error/i.test(msg)) {
            done = true;
            reject(new Error(`phonemizer: ${msg}`));
          }
        },
      })
        .then((m) => {
          m.callMain(["-l", voice, "--input", JSON.stringify([{ text }]), "--espeak_data", "/espeak-ng-data"]);
          if (!done) reject(new Error("phonemizer produced no output"));
        })
        .catch((e: unknown) => {
          if (!done) reject(e instanceof Error ? e : new Error(String(e)));
        });
    });
}
