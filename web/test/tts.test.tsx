// Read-aloud: text preparation, language routing, catalogue integrity and the button's behaviour.
// The models themselves are exercised by `npm run tts:samples` / `npm run tts:eval` (they need
// downloads), and were checked in Chrome; here the speaker is stubbed.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { chunkForSpeech, cleanForSpeech } from "../src/lib/tts/text";
import { detectLang, speaker, systemVoiceFor } from "../src/lib/tts/speaker";
import { splitByLang } from "../src/lib/tts/useReadAloud";
import { DEFAULT_VOICE, VOICES, voiceById, voiceFiles } from "../src/lib/tts/voices";
import { toWav } from "../src/lib/tts/engine";
import { ReadAloud } from "../src/components/ReadAloud";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("text for speech", () => {
  it("drops emoji, URLs and redaction brackets", () => {
    expect(cleanForSpeech("⛔ Call [PHONE_1] now — see https://x.top/kyc")).toBe("Call phone now, see link");
  });
  it("keeps the first chunk to one sentence and the rest under the limit", () => {
    const text = "This looks like a scam. Do not pay. Do not share any code. Real police never ask for money on a video call.";
    const chunks = chunkForSpeech(text, 60);
    expect(chunks[0]).toBe("This looks like a scam.");
    expect(chunks.every((c) => c.length <= 60)).toBe(true);
    expect(chunks.join(" ")).toBe(text);
  });
  it("splits Hindi on the danda", () => {
    expect(chunkForSpeech("यह धोखाधड़ी है। पैसे मत भेजिए। कोड मत बताइए।", 200)).toEqual(["यह धोखाधड़ी है।", "पैसे मत भेजिए। कोड मत बताइए।"]);
  });
  it("breaks a very long sentence on words", () => {
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
    expect(chunkForSpeech(long, 100).every((c) => c.length <= 100)).toBe(true);
  });
});

describe("language routing", () => {
  it("detects the script", () => {
    expect(detectLang("Hang up now.")).toBe("en");
    expect(detectLang("फ़ोन काट दीजिए, OTP मत बताइए।")).toBe("hi");
    expect(detectLang("ആരോടും OTP പറയരുത്.")).toBe("ml");
  });
  it("speaks a Hindi result with an English AI explanation in two voices", () => {
    const parts = splitByLang("यह धोखाधड़ी लगती है। फ़ोन काट दीजिए। This is a fake police call. Hang up.");
    expect(parts.map((p) => p.lang)).toEqual(["hi", "en"]);
  });
  it("only uses the device's local voices, never network ones", () => {
    const voices = [
      { name: "Google हिन्दी", lang: "hi-IN", localService: false, default: false },
      { name: "Microsoft Kalpana", lang: "hi-IN", localService: true, default: false },
    ];
    vi.stubGlobal("speechSynthesis", { getVoices: () => voices });
    expect(systemVoiceFor("hi")?.name).toBe("Microsoft Kalpana");
    vi.stubGlobal("speechSynthesis", { getVoices: () => [voices[0]] });
    expect(systemVoiceFor("hi")).toBeUndefined();
  });
});

describe("voice catalogue", () => {
  it("has a default for English, Hindi and Malayalam that exists and matches the language", () => {
    for (const [lang, id] of Object.entries(DEFAULT_VOICE)) expect(voiceById(id)?.lang).toBe(lang);
  });
  it("points every voice at Hugging Face files and flags non-commercial licences", () => {
    for (const v of VOICES) {
      expect(voiceFiles(v).every((u) => u.startsWith("https://huggingface.co/"))).toBe(true);
      if (/non-commercial|NC/.test(v.licence)) expect(v.commercialOk).toBe(false);
    }
    expect(new Set(VOICES.map((v) => v.id)).size).toBe(VOICES.length);
  });
});

describe("engine helpers", () => {
  it("only offers the fast Piper voices, two per language", () => {
    expect(VOICES.every((v) => v.engine === "piper")).toBe(true);
    for (const lang of ["en", "hi", "ml"]) expect(VOICES.filter((v) => v.lang === lang)).toHaveLength(2);
  });
  it("writes a valid 16-bit WAV", () => {
    const wav = toWav(new Float32Array([0, 0.5, -1, 1]), 22050);
    const dv = new DataView(wav.buffer);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe("RIFF");
    expect(dv.getUint32(24, true)).toBe(22050);
    expect(dv.getInt16(44 + 2 * 2, true)).toBe(-0x7fff);
    expect(wav.length).toBe(44 + 8);
  });
});

describe("ReadAloud button", () => {
  it("offers a one-time download when no voice is available, and says nothing is sent", async () => {
    vi.stubGlobal("speechSynthesis", { getVoices: () => [], cancel: () => {} });
    render(<ReadAloud text="This looks like a scam. Hang up." />);
    fireEvent.click(screen.getByRole("button", { name: /read aloud/i }));
    const offer = await screen.findByRole("dialog", { name: /download the voice/i });
    expect(offer).toHaveTextContent("English voice once (91 MB)");
    expect(offer).toHaveTextContent("never sent anywhere");
  });

  it("uses the device's own voice when there is one (no download)", async () => {
    const spoken: string[] = [];
    vi.stubGlobal("speechSynthesis", { getVoices: () => [{ name: "Local", lang: "en-US", localService: true, default: true }], cancel: () => {} });
    vi.spyOn(speaker(), "speakSystem").mockImplementation(async (_v, text) => {
      spoken.push(text);
    });
    render(<ReadAloud text="This looks like a scam. Hang up." />);
    fireEvent.click(screen.getByRole("button", { name: /read aloud/i }));
    await waitFor(() => expect(spoken).toEqual(["This looks like a scam. Hang up."]));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
