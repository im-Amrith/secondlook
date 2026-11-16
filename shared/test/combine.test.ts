import { describe, expect, it } from "vitest";
import { combine, combineScores, mergeChunkVerdicts } from "../src/combine";
import { scoreRules } from "../src/rules";
import { parseAiVerdict, levelFor, AI_VERDICT_JSON_SCHEMA, SIGNAL_IDS } from "../src/schema";
import { buildUserPrompt, estimateTokens, SYSTEM_PROMPT, MAX_OUTPUT_TOKENS } from "../src/prompt";

describe("combine", () => {
  const rules = scoreRules("Share your OTP urgently");
  it("rules-only verdict when AI is missing", () => {
    const v = combine(rules, null, { source: "ON_DEVICE" });
    expect(v.source).toBe("RULES");
    expect(v.score).toBe(rules.score);
    expect(v.redactions).toEqual([]);
    expect(v.signals.every((s) => s.from === "rules")).toBe(true);
  });
  it("AI can raise freely but only lower a little", () => {
    expect(combineScores(20, 90)).toBe(62);
    expect(combineScores(80, 0)).toBe(70);
    expect(combineScores(80, 70)).toBe(75);
  });
  it("adds AI-only signals and keeps redactions only for cloud", () => {
    const ai = { score: 90, level: "high" as const, signals: [{ id: "credentials" as const, excerpt: "OTP" }, { id: "secrecy" as const, excerpt: "tell no one" }], explanation: "Scam.", advice: "Stop." };
    const v = combine(rules, ai, { source: "IN_CLOUD", redactions: [{ type: "PHONE", count: 2 }] });
    expect(v.source).toBe("IN_CLOUD");
    expect(v.redactions).toEqual([{ type: "PHONE", count: 2 }]);
    expect(v.signals.filter((s) => s.id === "credentials")).toHaveLength(1);
    expect(v.signals.find((s) => s.id === "secrecy")?.from).toBe("ai");
    expect(v.advice).toBe("Stop.");
    const dev = combine(rules, ai, { source: "ON_DEVICE", redactions: [{ type: "PHONE", count: 2 }] });
    expect(dev.redactions).toEqual([]);
  });
  it("uses safe advice when the model says low but the final level is high", () => {
    const r = scoreRules("CBI digital arrest, stay on the video call, don't tell your family, pay now");
    const v = combine(r, { score: 10, level: "low", signals: [], explanation: "", advice: "Seems fine." }, { source: "ON_DEVICE" });
    expect(v.level).toBe("high");
    expect(v.advice).not.toBe("Seems fine.");
    expect(v.explanation.length).toBeGreaterThan(0);
  });
  it("merges chunk verdicts by max score", () => {
    const m = mergeChunkVerdicts([
      { score: 20, level: "low", signals: [{ id: "link", excerpt: "a" }], explanation: "a", advice: "a" },
      { score: 80, level: "high", signals: [{ id: "authority", excerpt: "b" }, { id: "link", excerpt: "c" }], explanation: "b", advice: "b" },
    ]);
    expect(m?.score).toBe(80);
    expect(m?.signals.map((s) => s.id)).toEqual(["link", "authority"]);
    expect(mergeChunkVerdicts([])).toBeNull();
  });
});

describe("schema", () => {
  it("parses and normalises model output", () => {
    const raw = '```json\n{"score": 140, "level":"bad", "signals":[{"id":"authority","excerpt":"CBI"},{"id":"nope","excerpt":"x"}], "explanation":"e", "advice":"a"}\n```';
    expect(parseAiVerdict(raw)).toEqual({ score: 100, level: "high", signals: [{ id: "authority", excerpt: "CBI" }], explanation: "e", advice: "a" });
    expect(parseAiVerdict("not json")).toBeNull();
    expect(parseAiVerdict({ score: "x" })).toBeNull();
    expect(parseAiVerdict({ score: 10 })?.level).toBe("low");
  });
  it("levels and schema enums line up", () => {
    expect([levelFor(0), levelFor(30), levelFor(60)]).toEqual(["low", "medium", "high"]);
    expect(AI_VERDICT_JSON_SCHEMA.properties.signals.items.properties.id.enum).toEqual([...SIGNAL_IDS]);
  });
});

describe("prompt", () => {
  it("is short and includes the rules hint and the message", () => {
    expect(estimateTokens(SYSTEM_PROMPT)).toBeLessThan(400);
    expect(MAX_OUTPUT_TOKENS).toBeLessThanOrEqual(256);
    const p = buildUserPrompt("hello", { signals: [], score: 0 });
    expect(p).toContain("nothing");
    expect(p).toContain('"""hello"""');
    expect(buildUserPrompt("x".repeat(100), undefined, { maxChars: 10 })).toContain("[cut]");
  });
  it("estimates denser tokens for Devanagari", () => {
    expect(estimateTokens("abcd".repeat(10))).toBe(10);
    expect(estimateTokens("नमस्ते")).toBeGreaterThan(2);
  });
});
