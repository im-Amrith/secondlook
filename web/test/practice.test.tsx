import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { scoreRules } from "@secondlook/shared";
import { AppProvider } from "../src/lib/app-context";
import { PracticePage } from "../src/pages/Practice";
import { isFirmRefusal, practicePrompt, PRACTICE, replyOrder } from "../src/lib/practice";
import { makeSimulatedPracticeRunner } from "../src/lib/models";
import { DEFAULT_SETTINGS, saveSettings } from "../src/lib/settings";

afterEach(() => saveSettings(DEFAULT_SETTINGS));

describe("practice content", () => {
  it("has every line, reply and feedback in English, Hindi and Malayalam", () => {
    for (const sc of PRACTICE) {
      for (const lang of ["en", "hi", "ml"] as const) {
        expect(sc.title[lang].length).toBeGreaterThan(3);
        for (const st of sc.steps) {
          for (const text of [st.line[lang], st.trick[lang], st.safe.reply[lang], st.safe.feedback[lang], st.unsafe.reply[lang], st.unsafe.feedback[lang]]) {
            expect(text.length, `${sc.id}/${lang}`).toBeGreaterThan(3);
          }
        }
      }
    }
  });

  it("uses real scam patterns: the engine flags every scammer line in the CBI and KYC calls", () => {
    for (const id of ["digital_arrest", "kyc"]) {
      const sc = PRACTICE.find((s) => s.id === id)!;
      for (const st of sc.steps) expect(scoreRules(st.line.en).signals.length, st.line.en).toBeGreaterThan(0);
    }
  });

  it("doesn't always put the safe answer first", () => {
    const orders = PRACTICE.flatMap((s) => s.steps.map((_, i) => replyOrder(s.id, i)[0]));
    expect(new Set(orders).size).toBe(2);
  });

  it("recognises a firm refusal", () => {
    expect(isFirmRefusal("I'm hanging up and calling my son")).toBe(true);
    expect(isFirmRefusal("No thanks, this is a scam")).toBe(true);
    expect(isFirmRefusal("I won't share the OTP")).toBe(true);
    expect(isFirmRefusal("OK sir, what should I do?")).toBe(false);
  });

  it("builds single-turn prompts for the on-device model", () => {
    const p = practicePrompt("a fake bank employee", [{ who: "caller", text: "Your KYC is pending" }, { who: "you", text: "Why?" }]);
    expect(p).toContain("Caller: Your KYC is pending");
    expect(p).toContain("Learner: Why?");
    expect(p).toMatch(/Write the caller's next message\.$/);
  });

  it("the simulated partner moves on each turn", async () => {
    const r = makeSimulatedPracticeRunner();
    const a = await r.run(practicePrompt("x", []));
    const b = await r.run(practicePrompt("x", [{ who: "caller", text: a.text }, { who: "you", text: "hmm" }]));
    expect(a.text).not.toBe(b.text);
    expect(b.source).toBe("ON_DEVICE");
  });
});

describe("Practice page", () => {
  it("plays a guided call to the end and shows the score and what to remember", async () => {
    render(<AppProvider><PracticePage /></AppProvider>);
    await userEvent.click(screen.getByRole("button", { name: /CBI/ }));
    const sc = PRACTICE[0]!;
    for (let i = 0; i < sc.steps.length; i++) {
      await userEvent.click(screen.getByRole("button", { name: sc.steps[i]!.safe.reply.en }));
      expect(screen.getByText(sc.steps[i]!.safe.feedback.en)).toBeInTheDocument();
      if (i < sc.steps.length - 1) await userEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    expect(screen.getByRole("heading", { name: "You spotted 4 of 4 tricks" })).toBeInTheDocument();
    expect(screen.getByText(/Never share an OTP/)).toBeInTheDocument();
  });

  it("explains the trick after an unsafe answer", async () => {
    render(<AppProvider><PracticePage /></AppProvider>);
    await userEvent.click(screen.getByRole("button", { name: /bank account will be blocked/ }));
    const st = PRACTICE[1]!.steps[0]!;
    await userEvent.click(screen.getByRole("button", { name: st.unsafe.reply.en }));
    expect(screen.getByText(st.unsafe.feedback.en)).toBeInTheDocument();
    expect(screen.getByText(/that's what they want/)).toBeInTheDocument();
  });

  it("runs in Hindi", async () => {
    saveSettings({ ...DEFAULT_SETTINGS, uiLang: "hi", onboarded: true });
    render(<AppProvider><PracticePage /></AppProvider>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("'ना' कहने का अभ्यास");
    await userEvent.click(screen.getByRole("button", { name: /सीबीआई/ }));
    expect(screen.getByText(PRACTICE[0]!.steps[0]!.line.hi)).toBeInTheDocument();
  });

  it("keeps free practice off without the private model", () => {
    render(<AppProvider><PracticePage /></AppProvider>);
    expect(screen.getByRole("button", { name: /free practice call/ })).toBeDisabled();
  });
});
