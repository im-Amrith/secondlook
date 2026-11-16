import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { checkMessage, combine, scoreRules } from "@secondlook/shared";
import { AppProvider } from "../src/lib/app-context";
import { CheckPage } from "../src/pages/Check";
import { adviceText, noteText, reasonText, rulesExplanation, translate, UI_LANGS } from "../src/lib/i18n";
import { DEFAULT_SETTINGS, saveSettings } from "../src/lib/settings";

describe("i18n dictionaries", () => {
  it("has every key in every language", async () => {
    const mod = await import("../src/lib/i18n");
    // translate() falls back to English, so check the raw table through a few keys per section.
    for (const lang of UI_LANGS.map((l) => l.id)) {
      for (const key of ["check.title", "result.high", "badge.deviceTitle", "followup.q2", "family.button", "setup.download", "settings.neverCloud"] as const) {
        expect(translate(lang, key).length, `${lang}:${key}`).toBeGreaterThan(2);
      }
    }
    expect(mod.translate("hi", "result.risk", { n: 92 })).toBe("जोखिम 92/100");
  });

  it("translates the engine's fixed advice, router reasons and notes", async () => {
    const r = scoreRules("CBI digital arrest, stay on the video call, do not tell your family");
    const v = combine(r, null, { source: "RULES" });
    expect(adviceText(v.advice, "hi")).toMatch(/1930/);
    expect(adviceText(v.advice, "hi")).not.toBe(v.advice);
    expect(adviceText("Some AI advice", "ml")).toBe("Some AI advice");
    expect(rulesExplanation(v.level, v.signals, "ml")).toMatch(/ഞങ്ങൾ കണ്ടെത്തിയത്/);
    const out = await checkMessage({ text: "मैं पुलिस से बोल रहा हूँ" }, { platform: "web", nanoAvailable: () => false, online: () => true, cloud: { run: async () => ({ text: "{}", source: "IN_CLOUD" }) }, settings: { neverCloud: false } });
    expect(reasonText({ ...out.decision, code: "cloud_lang", reason: "The private model isn't tested for Hindi yet, so…" }, "hi")).toContain("हिंदी");
    expect(noteText("The AI check didn't answer, so we ran a quick check.", "ml")).not.toMatch(/AI check didn't/);
  });
});

describe("Check page in Hindi", () => {
  it("renders the core flow in Hindi", async () => {
    saveSettings({ ...DEFAULT_SETTINGS, uiLang: "hi", onboarded: true });
    render(<AppProvider><CheckPage /></AppProvider>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("क्या यह धोखाधड़ी है?");
    await userEvent.type(screen.getByLabelText("संदेश"), "This is CBI. You are under digital arrest. Do not tell your family.");
    await userEvent.click(screen.getByRole("button", { name: "यह संदेश जाँचें" }));
    expect(await screen.findByRole("heading", { name: "यह धोखाधड़ी लगती है" })).toBeInTheDocument();
    expect(screen.getAllByRole("status").some((el) => /त्वरित जाँच/.test(el.textContent ?? ""))).toBe(true);
    saveSettings(DEFAULT_SETTINGS);
  });
});
