import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProvider } from "../src/lib/app-context";
import { CallGuardPage } from "../src/pages/CallGuard";
import { devanagariToMalayalam, fixScript } from "../src/lib/asr-text";
import { signInErrorText } from "../src/lib/family-model";
import { addTranscript, createCallState } from "@secondlook/shared";

afterEach(() => vi.unstubAllGlobals());

describe("Whisper output fixes", () => {
  it("moves Malayalam that Whisper wrote in Devanagari back into Malayalam letters", () => {
    // "ഡിജിറ്റൽ" written with the parallel Devanagari letters
    const deva = [..."ഡിജിറ്റൽ"].map((c) => String.fromCharCode(c.charCodeAt(0) - 0x400)).join("");
    expect(devanagariToMalayalam(deva)).toBe("ഡിജിറ്റൽ");
    expect(devanagariToMalayalam("ok। ഹലോ")).toBe("ok। ഹലോ");
  });

  it("drops Whisper's made-up text on silence, keeps real speech", () => {
    expect(fixScript(" Thank you.", "en")).toBe("");
    expect(fixScript("[Music]", "hi")).toBe("");
    expect(fixScript("आप डिजिटल अरेस्ट में हैं", "hi")).toBe("आप डिजिटल अरेस्ट में हैं");
  });

  it("a fixed-up Malayalam transcript still triggers Call Guard", () => {
    const heard = [..."നിങ്ങൾ ഡിജിറ്റൽ അറസ്റ്റിലാണ്. ആരോടും പറയരുത്"].map((c) => (/[ഀ-ൿ]/.test(c) ? String.fromCharCode(c.charCodeAt(0) - 0x400) : c)).join("");
    const s = addTranscript(createCallState(), fixScript(heard, "ml"), 0);
    expect(s.level).toBe("high");
  });
});

describe("Call Guard picks Whisper for Hindi and asks before downloading", () => {
  it("offers the one-time listening model download", async () => {
    vi.stubGlobal("Worker", class {});
    render(<AppProvider><CallGuardPage /></AppProvider>);
    await userEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    const start = screen.getByRole("button", { name: /Start listening/ });
    await vi.waitFor(() => expect(start).toBeEnabled());
    await userEvent.click(start);
    const dialog = screen.getByRole("dialog", { name: "Download the listening model?" });
    expect(dialog).toHaveTextContent(/calls in Hindi/);
    expect(dialog).toHaveTextContent(/300 MB/);
    expect(dialog).toHaveTextContent(/no sound ever leaves this device/);
  });
});

describe("sign-in errors", () => {
  it("explains a project without Google sign-in turned on", () => {
    expect(signInErrorText({ code: "auth/configuration-not-found", message: "x" })).toMatch(/isn't switched on/);
    expect(signInErrorText({ code: "auth/popup-blocked" })).toMatch(/pop-ups/);
    expect(signInErrorText(new Error("other"))).toBe("other");
  });
});
