// Chrome's built-in Prompt API (Gemini Nano). Used here only to *show* and *route on* availability;
// inference goes through Firebase AI Logic (see ai.ts), which wraps the same API.
// Text and image support are checked separately: some Chrome builds run text but not images
// (multimodal input is behind its own flag), and text checks must not fall back to the cloud
// just because images aren't supported.

export type NanoStatus = "unavailable" | "downloadable" | "downloading" | "available" | "unsupported";

interface LanguageModelStatic {
  availability(options?: object): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
}

export const NANO_TEXT_OPTIONS = {
  expectedInputs: [{ type: "text" as const, languages: ["en"] }],
  expectedOutputs: [{ type: "text" as const, languages: ["en"] }],
};

export const NANO_IMAGE_OPTIONS = {
  expectedInputs: [{ type: "text" as const, languages: ["en"] }, { type: "image" as const }],
  expectedOutputs: [{ type: "text" as const, languages: ["en"] }],
};

/** @deprecated kept for older imports; equals NANO_IMAGE_OPTIONS. */
export const NANO_CREATE_OPTIONS = NANO_IMAGE_OPTIONS;

export function languageModelApi(): LanguageModelStatic | null {
  const lm = (globalThis as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel;
  return lm && typeof lm.availability === "function" ? lm : null;
}

async function availability(options: object): Promise<NanoStatus> {
  const lm = languageModelApi();
  if (!lm) return "unsupported";
  try {
    return await lm.availability(options);
  } catch {
    return "unavailable";
  }
}

/** Status for text checks (the main path). */
export const nanoStatus = () => availability(NANO_TEXT_OPTIONS);
/** Status for screenshot checks. */
export const nanoImageStatus = () => availability(NANO_IMAGE_OPTIONS);

export const NANO_STATUS_TEXT: Record<NanoStatus, string> = {
  available: "Ready. Checks run on this device.",
  downloadable: "Not downloaded yet.",
  downloading: "Downloading…",
  unavailable: "This device can't run the private model.",
  unsupported: "This browser doesn't have the private model (needs Chrome 139+ on a computer).",
};
