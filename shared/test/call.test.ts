import { describe, expect, it } from "vitest";
import { addTranscript, CALL_QUESTIONS, createCallState, scoreAnswers, scoreRules, warningFor, type CallState } from "../src";

function feed(lines: string[]): CallState {
  return lines.reduce((s, l, i) => addTranscript(s, l, i * 1000), createCallState());
}

describe("Call Guard transcript", () => {
  it("raises a hang-up warning as a digital-arrest call unfolds", () => {
    let s = createCallState();
    s = addTranscript(s, "hello am I speaking with mister menon", 0);
    expect(s.level).toBe("low");
    expect(s.warning).toBeNull();
    s = addTranscript(s, "this is inspector rathore from mumbai police", 1000);
    expect(s.signals.map((x) => x.ruleId)).toContain("authority");
    s = addTranscript(s, "you are under digital arrest keep your camera on", 2000);
    expect(s.level).toBe("high");
    expect(s.warningRule).toBe("video_custody");
    expect(s.warning).toMatch(/digital arrest/i);
  });

  it("keeps signals after the words scroll away, and records when they were first heard", () => {
    const many = Array.from({ length: 80 }, (_, i) => `filler sentence number ${i}`);
    const s = feed(["do not tell your family about this", ...many]);
    expect(s.lines.length).toBeLessThanOrEqual(60);
    const secrecy = s.signals.find((x) => x.ruleId === "secrecy");
    expect(secrecy?.at).toBe(0);
  });

  it("matches a phrase split across two recognition results", () => {
    const s = feed(["you are under digital", "arrest from now"]);
    expect(s.signals.some((x) => x.ruleId === "video_custody")).toBe(true);
  });

  it("understands Hindi and Malayalam speech in their own scripts", () => {
    const hi = feed(["अब आप डिजिटल अरेस्ट में हैं", "किसी को मत बताना", "पैसे आरबीआई के खाते में भेजिए"]);
    expect(hi.level).toBe("high");
    expect(hi.signals.map((x) => x.ruleId)).toEqual(expect.arrayContaining(["video_custody", "secrecy", "safe_account"]));
    const ml = feed(["നിങ്ങൾ ഇപ്പോൾ ഡിജിറ്റൽ അറസ്റ്റിലാണ്", "ഇത് ആരോടും പറയരുത്"]);
    expect(ml.level).toBe("high");
  });

  it("stays calm on an ordinary call", () => {
    const s = feed(["hi amma reached bangalore safely", "will call you after dinner", "don't forget the doctor tomorrow at ten"]);
    expect(s.level).toBe("low");
    expect(s.warning).toBeNull();
  });

  it("ignores empty input", () => {
    const s = createCallState();
    expect(addTranscript(s, "   ", 0)).toBe(s);
  });
});

describe("new call rules", () => {
  it("flags 'safe account' transfers and screen-sharing apps", () => {
    expect(scoreRules("Transfer your savings to the RBI verification account").signals.map((s) => s.ruleId)).toContain("safe_account");
    expect(scoreRules("Please download AnyDesk so I can help you").signals.map((s) => s.ruleId)).toContain("remote_access");
    expect(scoreRules("I opened a savings account at the bank today").signals.map((s) => s.ruleId)).not.toContain("safe_account");
  });

  it("orders warnings by what matters most on a call", () => {
    expect(warningFor([{ ruleId: "urgency" }, { ruleId: "credentials" }])?.ruleId).toBe("credentials");
    expect(warningFor([{ ruleId: "authority" }, { ruleId: "video_custody" }])?.ruleId).toBe("video_custody");
    expect(warningFor([])).toBeNull();
  });
});

describe("quick questions", () => {
  it("scores yes answers like rules", () => {
    expect(scoreAnswers([]).level).toBe("low");
    expect(scoreAnswers(["rush"]).level).toBe("low");
    const r = scoreAnswers(["authority", "secret"]);
    expect(r.level).toBe("high");
    expect(r.warning).toMatch(/secret/i);
    expect(r.advice).toMatch(/Hang up/);
  });

  it("has unique ids and real rule weights", () => {
    expect(new Set(CALL_QUESTIONS.map((q) => q.id)).size).toBe(CALL_QUESTIONS.length);
    for (const q of CALL_QUESTIONS) expect(q.weight).toBeGreaterThan(0);
  });
});
