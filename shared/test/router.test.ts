import { describe, expect, it } from "vitest";
import { decideRoute, guessLang, chunkText, deviceBudget, type RouteInput } from "../src/router";

const base: RouteInput = { platform: "web", nanoAvailable: true, lang: "en", estTokens: 200, inputType: "text", multiTurn: false, userNeverCloud: false, online: true };
const d = (o: Partial<RouteInput>) => decideRoute({ ...base, ...o });

describe("router: one test per row of the routing table", () => {
  it("Nano available, English, short text or image → device", () => {
    expect(d({})).toMatchObject({ route: "device", code: "device_default", chunks: 1 });
    expect(d({ inputType: "image" }).route).toBe("device");
  });
  it("Hindi or Malayalam → redact → cloud (Android and web)", () => {
    expect(d({ platform: "android", lang: "hi" })).toMatchObject({ route: "cloud", code: "cloud_lang" });
    expect(d({ platform: "android", lang: "ml" }).reason).toMatch(/Malayalam/);
    expect(d({ lang: "hi" }).route).toBe("cloud");
  });
  it("Long text: chunk on device; too long → cloud", () => {
    const b = deviceBudget("web");
    expect(d({ estTokens: b * 2 })).toMatchObject({ route: "device", code: "device_chunked", chunks: 2 });
    expect(d({ estTokens: b * 5 })).toMatchObject({ route: "cloud", code: "cloud_too_long" });
    expect(d({ platform: "android", estTokens: 5000 }).code).toBe("device_chunked");
    expect(d({ platform: "android", estTokens: 3000 }).code).toBe("device_default");
    expect(d({ platform: "web", estTokens: 9000 }).code).toBe("device_chunked");
    expect(d({ platform: "web", estTokens: 3000 }).code).toBe("device_default");
  });
  it("Multi-turn follow-up → redact → cloud", () => {
    expect(d({ multiTurn: true })).toMatchObject({ route: "cloud", code: "cloud_followup" });
  });
  it("No Nano → redact → cloud", () => {
    expect(d({ nanoAvailable: false })).toMatchObject({ route: "cloud", code: "cloud_no_nano" });
  });
  it("Offline and no Nano → rules", () => {
    expect(d({ nanoAvailable: false, online: false })).toMatchObject({ route: "rules", code: "rules_offline" });
  });
  it("Offline with Nano → device still works", () => {
    expect(d({ online: false }).route).toBe("device");
    expect(d({ online: false, lang: "hi" }).route).toBe("device");
  });
  it("Never use cloud → device or rules only, never cloud", () => {
    expect(d({ userNeverCloud: true, nanoAvailable: false })).toMatchObject({ route: "rules", code: "rules_never_cloud" });
    expect(d({ userNeverCloud: true, lang: "hi" })).toMatchObject({ route: "device", code: "device_forced_lang" });
    expect(d({ userNeverCloud: true, multiTurn: true }).code).toBe("device_forced_followup");
    expect(d({ userNeverCloud: true, estTokens: 100000 })).toMatchObject({ route: "device", code: "device_forced_long", chunks: 3 });
    const variants: Partial<RouteInput>[] = [{}, { lang: "hi" }, { nanoAvailable: false }, { multiTurn: true }, { estTokens: 1e6 }];
    for (const o of variants) expect(d({ userNeverCloud: true, ...o }).route).not.toBe("cloud");
  });
  it("Remote Config cloud switch off → never cloud", () => {
    expect(d({ cloudEnabled: false, nanoAvailable: false }).code).toBe("rules_cloud_off");
    expect(d({ cloudEnabled: false, lang: "ml" }).route).toBe("device");
  });
  it("every decision has a human-readable reason", () => {
    const variants: Partial<RouteInput>[] = [{}, { nanoAvailable: false }, { lang: "hi" }, { multiTurn: true }, { nanoAvailable: false, online: false }];
    for (const o of variants) expect(d(o).reason.length).toBeGreaterThan(20);
  });
});

describe("guessLang", () => {
  it("detects scripts and romanised Hindi", () => {
    expect(guessLang("Your parcel is held at customs")).toBe("en");
    expect(guessLang("आपका पार्सल कस्टम में रोका गया है")).toBe("hi");
    expect(guessLang("നിങ്ങളുടെ അക്കൗണ്ട് ബ്ലോക്ക് ചെയ്യും")).toBe("ml");
    expect(guessLang("Aapka account block ho jayega, turant KYC karo")).toBe("latin-mixed");
    expect(guessLang("")).toBe("en");
  });
});

describe("chunkText", () => {
  it("splits on whitespace into n parts covering the text", () => {
    const t = Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ");
    const parts = chunkText(t, 3);
    expect(parts).toHaveLength(3);
    expect(parts.join(" ")).toBe(t);
    expect(chunkText("hi", 1)).toEqual(["hi"]);
  });
});
