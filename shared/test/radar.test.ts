import { describe, expect, it } from "vitest";
import { classifyPattern, isoWeek, radarDocId, radarWeeks, RADAR_PATTERNS, RADAR_REGIONS, scoreRules, summariseRadar } from "../src";

const ids = (text: string) => scoreRules(text).signals.map((s) => s.ruleId);

describe("classifyPattern", () => {
  it("names common Indian scams from the rules that fired", () => {
    expect(classifyPattern(ids("This is CBI. You are under digital arrest. Do not tell your family."))).toBe("digital_arrest");
    expect(classifyPattern(ids("Your electricity power will be disconnected tonight. Call our officer."))).toBe("electricity");
    expect(classifyPattern(ids("Dear customer your account will be blocked. Update KYC now"))).toBe("bank_kyc");
    expect(classifyPattern(ids("Work from home and earn Rs 5000 daily by liking videos"))).toBe("job_task");
    expect(classifyPattern(ids("Congratulations, you have won the lucky draw! Pay the processing fee to release the prize"))).toBe("prize_lottery");
    expect(classifyPattern(ids("Lost my phone, this is my new number. Please send Rs 20,000 urgently"))).toBe("family_emergency");
    expect(classifyPattern([])).toBe("other");
  });

  it("also understands AI signal categories", () => {
    expect(classifyPattern(["job", "money_request"])).toBe("job_task");
    expect(classifyPattern(["credentials", "link"])).toBe("bank_kyc");
  });

  it("always returns a pattern the Firestore rules accept", () => {
    for (const text of ["", "hello", "gift card bitcoin", "my darling I love you send money", "police warrant"]) {
      expect(RADAR_PATTERNS).toContain(classifyPattern(ids(text)));
    }
  });
});

describe("weeks and ids", () => {
  it("computes ISO weeks, including around new year", () => {
    expect(isoWeek(new Date(2026, 10, 25))).toBe("2026-W48");
    expect(isoWeek(new Date(2021, 0, 3))).toBe("2020-W53");
    expect(isoWeek(new Date(2024, 11, 30))).toBe("2025-W01");
    expect(radarWeeks(new Date(2026, 10, 25))).toEqual(["2026-W48", "2026-W47"]);
  });

  it("builds the counter id the rules check", () => {
    expect(radarDocId("2026-W48", "digital_arrest", "KL")).toBe("2026-W48_digital_arrest_KL");
    expect(new Set(RADAR_REGIONS.map((r) => r.id)).size).toBe(RADAR_REGIONS.length);
    for (const r of RADAR_REGIONS) expect(r.id).toMatch(/^[A-Z]{2}$/);
  });
});

describe("summariseRadar", () => {
  it("totals this week and last week per pattern, with a region count", () => {
    const rows = summariseRadar(
      [
        { week: "2026-W48", pattern: "digital_arrest", region: "KL", count: 12 },
        { week: "2026-W48", pattern: "digital_arrest", region: "MH", count: 25 },
        { week: "2026-W47", pattern: "digital_arrest", region: "KL", count: 9 },
        { week: "2026-W48", pattern: "electricity", region: "KL", count: 3 },
        { week: "2026-W47", pattern: "job_task", region: "DL", count: 4 },
        { week: "2026-W40", pattern: "romance", region: "DL", count: 99 },
      ],
      ["2026-W48", "2026-W47"],
      "KL",
    );
    expect(rows.map((r) => r.pattern)).toEqual(["digital_arrest", "electricity", "job_task"]);
    expect(rows[0]).toEqual({ pattern: "digital_arrest", thisWeek: 37, lastWeek: 9, inRegion: 12 });
  });
});
