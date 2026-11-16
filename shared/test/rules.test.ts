import { describe, expect, it } from "vitest";
import { RULES, scoreRules, probOr, adviceFor } from "../src/rules";

const hit = (text: string) => scoreRules(text).signals.map((s) => s.ruleId);

describe("rules engine", () => {
  it("keeps the 16 original rules plus the new ones", () => {
    const ids = RULES.map((r) => r.id);
    for (const id of ["ff_request","credentials","overpayment","gift_card_crypto","authority","prize","romance","utility_threat","job_scam","suspicious_link","shipping_agent","advance_fee","urgency","off_platform","unverifiable","too_good"]) expect(ids).toContain(id);
    expect(ids).toContain("secrecy");
    expect(ids).toContain("video_custody");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("probabilistic OR combines weights", () => {
    expect(probOr([])).toBe(0);
    expect(probOr([0.5])).toBeCloseTo(0.5);
    expect(probOr([0.5, 0.5])).toBeCloseTo(0.75);
  });

  it("flags a digital-arrest message as high with secrecy and custody", () => {
    const r = scoreRules("This is CBI. You are under digital arrest. Stay on the video call and do not tell your family. Transfer Rs 2,00,000 immediately.");
    expect(r.level).toBe("high");
    const ids = r.signals.map((s) => s.ruleId);
    expect(ids).toEqual(expect.arrayContaining(["authority", "video_custody", "secrecy", "urgency", "payment_demand"]));
    expect(r.advice).toMatch(/1930|cybercrime/);
  });

  it("detects secrecy phrases in English, Hinglish and Devanagari", () => {
    expect(hit("Please don't tell anyone about this")).toContain("secrecy");
    expect(hit("do not disconnect the call")).toContain("secrecy");
    expect(hit("ye baat kisi ko mat batana")).toContain("secrecy");
    expect(hit("यह बात किसी को मत बताना")).toContain("secrecy");
  });

  it("detects KYC/account block and look-alike links", () => {
    const ids = hit("Your KYC has expired. Account will be blocked today. Update at kyc-update-sbi.co.in now");
    expect(ids).toEqual(expect.arrayContaining(["account_block", "suspicious_link"]));
  });

  it("returns low with generic advice for a benign message", () => {
    const r = scoreRules("Hi Ma, reached home safely. Will call you after dinner.");
    expect(r.level).toBe("low");
    expect(r.signals).toHaveLength(0);
    expect(r.advice).not.toMatch(/paypal|vault/i);
  });

  it("advice is never PayPal-specific", () => {
    for (const lvl of ["low", "medium", "high"] as const) expect(adviceFor(lvl, [])).not.toMatch(/paypal|vault|goods & services/i);
  });

  it("weight overrides can disable or change a rule", () => {
    const t = "pay now urgently";
    expect(scoreRules(t).signals.some((s) => s.ruleId === "urgency")).toBe(true);
    expect(scoreRules(t, { weights: { urgency: 0 } }).signals.some((s) => s.ruleId === "urgency")).toBe(false);
    expect(scoreRules(t, { weights: { urgency: 0.9 } }).score).toBe(90);
  });

  it("extra rules from config work, and bad patterns are ignored", () => {
    const r = scoreRules("Your FASTag is expiring, renew here", {
      extraRules: [
        { id: "fastag", category: "link", label: "FASTag renewal", why: "x", weight: 0.5, pattern: "fastag" },
        { id: "bad", category: "link", label: "bad", why: "x", weight: 0.5, pattern: "([" },
      ],
    });
    expect(r.signals.map((s) => s.ruleId)).toEqual(["fastag"]);
  });

  it("custom thresholds change the level", () => {
    expect(scoreRules("urgent", { thresholds: { medium: 10, high: 15 } }).level).toBe("high");
  });

  it("excerpts are short context around the match", () => {
    const r = scoreRules("a".repeat(100) + " share your OTP " + "b".repeat(100));
    expect(r.signals[0]!.excerpt.length).toBeLessThan(80);
    expect(r.signals[0]!.excerpt).toMatch(/OTP/);
  });
});
