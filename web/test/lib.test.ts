import { describe, expect, it } from "vitest";
import { combine, scoreRules } from "@secondlook/shared";
import { alertFromVerdict, ALERT_KEYS, describeAlert, timeAgo } from "../src/lib/family";
import { parseConfig, RC_DEFAULTS, DEFAULT_CONFIG } from "../src/lib/remoteConfig";

const SECRET = "Inspector Sharma CBI digital arrest, do not tell your family, pay Rs 50,000 now to 9876543210";

describe("family alerts carry metadata only", () => {
  const verdict = combine(scoreRules(SECRET), null, { source: "RULES" });
  const circle = { id: "c1", ownerUid: "u1", ownerName: "Dad", memberUids: ["u1", "u2"] };
  const a = alertFromVerdict(verdict, circle, { uid: "u1", displayName: "Ravi Kumar" }, "web");

  it("uses only allow-listed keys (same list as firestore.rules)", () => {
    for (const k of Object.keys(a)) expect(ALERT_KEYS as readonly string[]).toContain(k);
  });
  it("never includes message text, excerpts or numbers from the message", () => {
    const json = JSON.stringify(a);
    for (const bit of ["Sharma", "digital arrest", "9876543210", "50,000", "tell your family"]) expect(json).not.toContain(bit);
    expect(a.signalIds).toEqual(expect.arrayContaining(["authority", "secrecy"]));
    expect(a.fromName).toBe("Ravi");
    expect(a.memberUids).toEqual(["u1", "u2"]);
  });
  it("describes an alert like the plan says", () => {
    const now = 1_000_000_000;
    const s = describeAlert({ fromName: "Dad", signalIds: ["authority", "urgency", "money_request"], createdAt: { toMillis: () => now - 120_000 } as never }, now);
    expect(s).toBe("Dad: 3 scam signals (fake authority, urgency, money request), 2 min ago");
    expect(timeAgo(now - 5_000, now)).toBe("just now");
    expect(timeAgo(now - 3 * 3600_000, now)).toBe("3 hours ago");
  });
});

describe("remote config parsing", () => {
  it("defaults match the in-code defaults", () => {
    expect(DEFAULT_CONFIG.cloudEnabled).toBe(true);
    expect(DEFAULT_CONFIG.rules.thresholds).toEqual({ medium: 30, high: 60 });
    expect(parseConfig(RC_DEFAULTS).cloudModel).toBe("gemini-3.5-flash-lite");
  });
  it("parses strings from Remote Config and ignores junk", () => {
    const c = parseConfig({
      risk_threshold_medium: "25",
      risk_threshold_high: "10",
      cloud_enabled: "false",
      rule_weight_overrides: '{"urgency":0.3,"bad":"x"}',
      extra_rules: '[{"id":"fastag","category":"link","label":"FASTag","why":"w","weight":0.5,"pattern":"fastag"},{"id":"x","category":"nope","weight":1,"pattern":"y"}]',
      scam_of_the_week: "Fake FASTag renewals",
    });
    expect(c.cloudEnabled).toBe(false);
    expect(c.rules.thresholds).toEqual({ medium: 25, high: 26 });
    expect(c.rules.weights).toEqual({ urgency: 0.3 });
    expect(c.rules.extraRules?.map((r) => r.id)).toEqual(["fastag"]);
    expect(parseConfig({ rule_weight_overrides: "{not json" }).rules.weights).toEqual({});
    expect(scoreRules("renew your fastag", c.rules).signals[0]?.ruleId).toBe("fastag");
  });
});
