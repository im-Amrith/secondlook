// Pure model plumbing with no Firebase imports, so it stays in the small first-load bundle.
import { scoreRules, type ModelRunner } from "@secondlook/shared";

export const DEFAULT_CLOUD_MODEL = "gemini-3.5-flash-lite";

export interface DeviceRunner extends ModelRunner {
  /** Must be called from a user gesture (button click). Downloads Gemini Nano if needed. */
  initialize(onProgress?: (p: number) => void): Promise<void>;
  simulated?: boolean;
}

/**
 * DEV ONLY: a stand-in for Gemini Nano so the on-device path can be exercised where Nano isn't
 * available (e.g. automated browsers). Enabled with ?mockNano in `npm run dev`. Clearly labelled.
 */
export function makeSimulatedDeviceRunner(): DeviceRunner {
  return {
    simulated: true,
    initialize: async (onProgress) => {
      for (let i = 1; i <= 5; i++) {
        await new Promise((r) => setTimeout(r, 120));
        onProgress?.(i / 5);
      }
    },
    run: async (prompt) => {
      await new Promise((r) => setTimeout(r, 400));
      const body = prompt.split('"""')[1] ?? prompt;
      const r = scoreRules(body);
      const json = {
        score: Math.min(100, r.score + (r.signals.length ? 5 : 0)),
        level: r.level,
        signals: r.signals.slice(0, 4).map((s) => ({ id: s.id, excerpt: s.excerpt.slice(0, 60) })),
        explanation: `(Simulated on-device model) ${r.explanation}`,
        advice: r.advice,
      };
      return { text: JSON.stringify(json), source: "ON_DEVICE" };
    },
  };
}

/** DEV ONLY stand-in for follow-up answers (see makeSimulatedDeviceRunner). */
export function makeSimulatedFollowUpRunner(): ModelRunner {
  return {
    run: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return { text: "(Simulated on-device model) Don't reply or pay. If you already shared a code or paid, call your bank on the number on your card now, then call 1930.", source: "ON_DEVICE" };
    },
  };
}

/** DEV ONLY stand-in for the practice partner: plays a short scripted scam caller. */
export function makeSimulatedPracticeRunner(): ModelRunner {
  const lines = [
    "(Simulated on-device model) Hello, this is Inspector Rao from the CBI. Your Aadhaar is linked to a money laundering case.",
    "(Simulated on-device model) You are under digital arrest. Stay on this call and do not tell your family.",
    "(Simulated on-device model) Transfer your savings to the RBI verification account immediately, or you will be arrested.",
    "(Simulated on-device model) Tell me the OTP you just received to verify your identity.",
  ];
  return {
    run: async (prompt) => {
      await new Promise((r) => setTimeout(r, 300));
      const turn = (prompt.match(/^Caller:/gm) ?? []).length;
      return { text: lines[Math.min(turn, lines.length - 1)]!, source: "ON_DEVICE" };
    },
  };
}
