// Messages between the page and the TTS worker.
export const VOICE_CACHE = "secondlook-voices-v1";

export type WorkerIn =
  | { id: number; type: "prepare"; voiceId: string }
  | { id: number; type: "speak"; voiceId: string; text: string; speed?: number }
  | { id: number; type: "cancel" };

export type WorkerOut =
  | { id: number; type: "progress"; file: string; loaded: number; total: number }
  | { id: number; type: "chunk"; pcm: Float32Array; sampleRate: number }
  | { id: number; type: "done" }
  | { id: number; type: "error"; message: string };
