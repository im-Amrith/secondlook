import { describe, expect, it } from "vitest";
import { metrics, recordedScorer, rulesScorer, runScorer, type Row } from "../lib";
import { readFileSync } from "node:fs";

const row = (scam: boolean, flagged: boolean): Row => ({ text: "", scam, flagged, pred: { score: 0, level: flagged ? "high" : "low", latencyMs: 1 } });

describe("eval metrics", () => {
  it("computes precision, recall, accuracy", () => {
    const m = metrics([row(true, true), row(true, false), row(false, true), row(false, false)]);
    expect(m).toMatchObject({ tp: 1, fn: 1, fp: 1, tn: 1, precision: 0.5, recall: 0.5, accuracy: 0.5 });
    expect(metrics([]).precision).toBe(0);
  });
  it("rules scorer runs every case in every dataset", async () => {
    for (const f of ["scam.json", "scam_holdout.json", "secondlook.json"]) {
      const cases = JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
      expect(cases.length).toBeGreaterThan(10);
      const rows = await runScorer(rulesScorer, cases);
      expect(rows).toHaveLength(cases.length);
      for (const c of cases) expect(typeof c.scam).toBe("boolean");
    }
  });
  it("recorded scorer replays predictions and fails loudly on gaps", async () => {
    const s = recordedScorer("device", [{ text: "a", score: 80, level: "high", source: "ON_DEVICE" }]);
    expect((await s.predict("a")).source).toBe("ON_DEVICE");
    await expect(s.predict("b")).rejects.toThrow();
  });
});
