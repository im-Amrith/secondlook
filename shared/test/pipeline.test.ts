import { describe, expect, it, vi } from "vitest";
import { checkMessage, type ModelRunner, type PipelineDeps } from "../src/pipeline";

const SCAM = "This is Inspector Rajesh Sharma, CBI. You are under digital arrest. Call 9876543210 and do not tell your family. Pay to ramesh@okaxis now.";
const aiJson = (score: number) => JSON.stringify({ score, level: score >= 60 ? "high" : score >= 30 ? "medium" : "low", signals: [{ id: "authority", excerpt: "CBI" }], explanation: "Fake police.", advice: "Hang up." });

function runner(source: "ON_DEVICE" | "IN_CLOUD", reply = aiJson(95)): ModelRunner & { run: ReturnType<typeof vi.fn> } {
  return { run: vi.fn(async () => ({ text: reply, source })) };
}

const deps = (o: Partial<PipelineDeps> = {}): PipelineDeps => ({
  platform: "web",
  nanoAvailable: () => true,
  online: () => true,
  device: runner("ON_DEVICE"),
  cloud: runner("IN_CLOUD"),
  settings: { neverCloud: false },
  ...o,
});

describe("checkMessage pipeline (mocked models)", () => {
  it("runs on device when Nano is available and sends nothing", async () => {
    const d = deps();
    const out = await checkMessage({ text: SCAM }, d);
    expect(out.verdict.source).toBe("ON_DEVICE");
    expect(out.sentText).toBeNull();
    expect(out.verdict.redactions).toEqual([]);
    expect(d.device!.run).toHaveBeenCalledTimes(1);
    expect(d.cloud!.run).not.toHaveBeenCalled();
    expect(out.verdict.level).toBe("high");
  });

  it("redacts before the cloud when Nano is missing — no raw identifiers leave", async () => {
    const d = deps({ nanoAvailable: () => false });
    const out = await checkMessage({ text: SCAM }, d);
    expect(out.verdict.source).toBe("IN_CLOUD");
    const sent = (d.cloud!.run as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(sent).not.toMatch(/9876543210|ramesh@okaxis|Rajesh/);
    expect(sent).toContain("[PHONE_1]");
    expect(out.sentText).toBe(sent);
    expect(out.verdict.redactions).toEqual(expect.arrayContaining([{ type: "PHONE", count: 1 }, { type: "UPI", count: 1 }, { type: "NAME", count: 1 }]));
    expect(out.decision.code).toBe("cloud_no_nano");
  });

  it("routes Hindi to the cloud (redacted)", async () => {
    const d = deps();
    const out = await checkMessage({ text: "मैं पुलिस से बोल रहा हूँ, 9876543210 पर तुरंत कॉल करें" }, d);
    expect(out.decision.code).toBe("cloud_lang");
    expect(out.sentText).not.toContain("9876543210");
  });

  it("never uses the cloud when the user said so", async () => {
    const d = deps({ nanoAvailable: () => false, settings: { neverCloud: true } });
    const out = await checkMessage({ text: SCAM }, d);
    expect(out.verdict.source).toBe("RULES");
    expect(d.cloud!.run).not.toHaveBeenCalled();
    expect(out.verdict.level).toBe("high");
  });

  it("falls back to rules when offline with no Nano", async () => {
    const out = await checkMessage({ text: SCAM }, deps({ nanoAvailable: () => false, online: () => false }));
    expect(out.verdict.source).toBe("RULES");
    expect(out.decision.code).toBe("rules_offline");
  });

  it("falls back to redacted cloud if the device model throws", async () => {
    const device = { run: vi.fn(async () => { throw new Error("busy"); }) };
    const d = deps({ device });
    const out = await checkMessage({ text: SCAM }, d);
    expect(out.verdict.source).toBe("IN_CLOUD");
    expect(out.fallbackNote).toMatch(/on-device/);
    expect(out.sentText).not.toContain("9876543210");
  });

  it("falls back to rules if the device fails and the cloud is off", async () => {
    const device = { run: vi.fn(async () => ({ text: "garbage", source: "ON_DEVICE" as const })) };
    const out = await checkMessage({ text: SCAM }, deps({ device, config: { cloudEnabled: false } }));
    expect(out.verdict.source).toBe("RULES");
    expect(out.fallbackNote).toBeTruthy();
  });

  it("falls back to device if the cloud throws", async () => {
    const cloud = { run: vi.fn(async () => { throw new Error("quota"); }) };
    const out = await checkMessage({ text: "मैं पुलिस से बोल रहा हूँ" }, deps({ cloud }));
    expect(out.verdict.source).toBe("ON_DEVICE");
    expect(out.sentText).toBeNull();
  });

  it("asks before sending a screenshot to the cloud, and respects no", async () => {
    const image = { data: "AAAA", mimeType: "image/png" as const };
    const no = deps({ nanoAvailable: () => false, confirmImageUpload: async () => false });
    const out = await checkMessage({ image }, no);
    expect(no.cloud!.run).not.toHaveBeenCalled();
    expect(out.inconclusive).toBe(true);
    const yes = deps({ nanoAvailable: () => false, confirmImageUpload: async () => true });
    const out2 = await checkMessage({ image }, yes);
    expect(out2.sentImage).toBe(true);
    expect(out2.verdict.source).toBe("IN_CLOUD");
  });

  it("screenshots run on device when Nano is available", async () => {
    const d = deps();
    const out = await checkMessage({ image: { data: "AAAA", mimeType: "image/jpeg" } }, d);
    expect(out.verdict.source).toBe("ON_DEVICE");
    expect((d.device!.run as ReturnType<typeof vi.fn>).mock.calls[0]![1]).toMatchObject({ mimeType: "image/jpeg" });
  });

  it("chunks long text on device", async () => {
    const d = deps();
    const long = "Please wait. ".repeat(3000) + SCAM;
    const out = await checkMessage({ text: long }, d);
    expect(out.decision.code).toBe("device_chunked");
    expect((d.device!.run as ReturnType<typeof vi.fn>).mock.calls.length).toBe(out.decision.chunks);
  });

  it("applies config thresholds and weights", async () => {
    const out = await checkMessage({ text: "urgent" }, deps({ nanoAvailable: () => false, online: () => false, config: { rules: { weights: { urgency: 0.9 } } } }));
    expect(out.verdict.score).toBe(90);
  });
});

import { askFollowUp } from "../src/pipeline";

describe("askFollowUp (multi-turn → redacted cloud)", () => {
  const verdict = { score: 95, level: "high" as const, signals: [], explanation: "Fake police.", advice: "Hang up.", source: "ON_DEVICE" as const, redactions: [] };
  const base = { platform: "web" as const, nanoAvailable: () => true, online: () => true, settings: { neverCloud: false } };

  it("goes to the cloud even when Nano is available, with redaction", async () => {
    const cloud = { run: vi.fn(async () => ({ text: "Call your bank now.", source: "IN_CLOUD" as const })) };
    const device = { run: vi.fn(async () => ({ text: "x", source: "ON_DEVICE" as const })) };
    const out = await askFollowUp("I paid 9876543210 already, what now?", SCAM, verdict, { ...base, cloud, device });
    expect(out.decision.code).toBe("cloud_followup");
    expect(out.source).toBe("IN_CLOUD");
    expect(device.run).not.toHaveBeenCalled();
    expect(out.sentText).not.toMatch(/9876543210|Rajesh|ramesh@okaxis/);
    expect(out.sentText).toContain("[PHONE_1]");
    expect(out.answer).toBe("Call your bank now.");
  });

  it("answers on device when the cloud is off", async () => {
    const device = { run: vi.fn(async () => ({ text: "Hang up and call family.", source: "ON_DEVICE" as const })) };
    const out = await askFollowUp("What now?", SCAM, verdict, { ...base, device, settings: { neverCloud: true } });
    expect(out.source).toBe("ON_DEVICE");
    expect(out.sentText).toBeNull();
  });

  it("gives standard advice with no AI", async () => {
    const out = await askFollowUp("What now?", SCAM, verdict, { ...base, nanoAvailable: () => false });
    expect(out.source).toBe("RULES");
    expect(out.answer).toMatch(/1930/);
  });
});

import { parseNames } from "../src/prompt";

describe("on-device name masking before the cloud", () => {
  const HINDI = "मैं पुलिस से बोल रहा हूँ। Ramesh Kumar का केस है। Anita को मत बताना। 9876543210 पर कॉल करें।";

  it("masks names found by Nano when the check must go to the cloud", async () => {
    const findNames = vi.fn(async () => ["Ramesh Kumar", "Anita", "Not In Text"]);
    const d = deps({ findNames });
    const out = await checkMessage({ text: HINDI }, d);
    expect(out.decision.code).toBe("cloud_lang");
    expect(findNames).toHaveBeenCalledTimes(1);
    expect(out.sentText).not.toMatch(/Ramesh|Anita|9876543210/);
    expect(out.verdict.redactions).toEqual(expect.arrayContaining([{ type: "NAME", count: 2 }]));
  });

  it("never asks the device when Nano isn't available, and survives a failing finder", async () => {
    const findNames = vi.fn(async () => ["x"]);
    await checkMessage({ text: SCAM }, deps({ nanoAvailable: () => false, findNames }));
    expect(findNames).not.toHaveBeenCalled();
    const broken = vi.fn(async () => { throw new Error("busy"); });
    const out = await checkMessage({ text: HINDI }, deps({ findNames: broken }));
    expect(out.verdict.source).toBe("IN_CLOUD");
  });

  it("parseNames keeps only names that occur in the text", () => {
    expect(parseNames('{"names":["Ramesh","CBI officer x","Ramesh",5]}', "Ramesh called")).toEqual(["Ramesh"]);
    expect(parseNames("nope", "x")).toEqual([]);
  });
});

describe("honesty when the cloud answer is unusable", () => {
  it("still reports what was sent and the redactions", async () => {
    const cloud = { run: vi.fn(async () => ({ text: "not json at all", source: "IN_CLOUD" as const })) };
    const out = await checkMessage({ text: SCAM }, deps({ nanoAvailable: () => false, cloud }));
    expect(out.verdict.source).toBe("RULES");
    expect(out.sentText).not.toBeNull();
    expect(out.verdict.redactions.length).toBeGreaterThan(0);
    expect(out.fallbackNote).toMatch(/couldn't be read/);
  });
});
