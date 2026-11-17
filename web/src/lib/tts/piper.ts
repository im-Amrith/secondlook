// Piper (VITS) voices through ONNX Runtime. The runtime is injected so the same code runs on
// onnxruntime-web in the browser worker and onnxruntime-node in the sample script.
import { PIPER_BASE, type VoiceInfo } from "./voices";
import type { LoadBytes } from "./kokoro";

interface OrtTensorCtor { new (type: string, data: unknown, dims?: number[]): unknown }
export interface OrtLike {
  Tensor: OrtTensorCtor;
  InferenceSession: { create(model: Uint8Array, opts?: Record<string, unknown>): Promise<{ run(feeds: Record<string, unknown>): Promise<Record<string, { data: unknown }>> }> };
}

interface PiperConfig {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  num_speakers: number;
}

export interface PiperVoice {
  sampleRate: number;
  synth(ids: number[], speed?: number): Promise<Float32Array>;
}

export async function createPiperVoice(ort: OrtLike, v: VoiceInfo, loadBytes: LoadBytes, providers: string[] = ["wasm"]): Promise<PiperVoice> {
  const url = `${PIPER_BASE}/${v.piperPath}`;
  const [modelBytes, cfgBytes] = await Promise.all([loadBytes(url), loadBytes(`${url}.json`)]);
  const cfg = JSON.parse(new TextDecoder().decode(cfgBytes)) as PiperConfig;
  const session = await ort.InferenceSession.create(new Uint8Array(modelBytes), { executionProviders: providers });
  return {
    sampleRate: cfg.audio.sample_rate,
    async synth(ids, speed = 1) {
      const { noise_scale, length_scale, noise_w } = cfg.inference;
      const feeds: Record<string, unknown> = {
        input: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
        input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
        // Bigger length_scale = slower speech.
        scales: new ort.Tensor("float32", Float32Array.from([noise_scale, length_scale / speed, noise_w]), [3]),
      };
      if (cfg.num_speakers > 1) feeds.sid = new ort.Tensor("int64", BigInt64Array.from([0n]), [1]);
      const out = await session.run(feeds);
      return out.output!.data as Float32Array;
    },
  };
}
