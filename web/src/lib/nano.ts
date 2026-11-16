// Chrome's built-in Prompt API (Gemini Nano). Used only to *show* availability; the actual
// inference goes through Firebase AI Logic (see ai.ts), which wraps the same API.

export type NanoStatus = "unavailable" | "downloadable" | "downloading" | "available" | "unsupported";

interface LanguageModelStatic {
  availability(options?: object): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
}

/** Same expected inputs/outputs we pass to the SDK, so the answer matches what we'll ask for. */
export const NANO_CREATE_OPTIONS = {
  expectedInputs: [
    { type: "text" as const, languages: ["en"] },
    { type: "image" as const },
  ],
  expectedOutputs: [{ type: "text" as const, languages: ["en"] }],
};

export function languageModelApi(): LanguageModelStatic | null {
  const lm = (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel;
  return lm && typeof lm.availability === "function" ? lm : null;
}

export async function nanoStatus(): Promise<NanoStatus> {
  const lm = languageModelApi();
  if (!lm) return "unsupported";
  try {
    return await lm.availability(NANO_CREATE_OPTIONS);
  } catch {
    // Older Chrome builds reject image inputs; ask about text only.
    try {
      return await lm.availability({ expectedInputs: [{ type: "text", languages: ["en"] }] });
    } catch {
      return "unavailable";
    }
  }
}

export const NANO_STATUS_TEXT: Record<NanoStatus, string> = {
  available: "Ready. Checks run on this device.",
  downloadable: "Not downloaded yet.",
  downloading: "Downloading…",
  unavailable: "This device can't run the private model.",
  unsupported: "This browser doesn't have the private model (needs Chrome 139+ on a computer).",
};
