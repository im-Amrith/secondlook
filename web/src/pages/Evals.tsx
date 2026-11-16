// Developer page (#/evals): runs the labelled eval sets through the REAL on-device or cloud model
// in this browser and downloads the predictions. Feed the file to the Node runner:
//   npm run evals -- --recorded device=predictions-device.json --write
import { useState } from "react";
import { combine, parseAiVerdict, redact, scoreRules, buildUserPrompt, type ModelRunner } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import scamSet from "../../../evals/data/scam.json";
import holdoutSet from "../../../evals/data/scam_holdout.json";
import newSet from "../../../evals/data/secondlook.json";

interface Case { text: string; scam: boolean }
interface Rec { text: string; score: number; level: string; aiScore: number | null; source: string; latencyMs: number; error?: string }

const ALL: Case[] = [...(scamSet as Case[]), ...(holdoutSet as Case[]), ...(newSet as Case[])];

export function EvalsPage() {
  const app = useApp();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  async function run(mode: "device" | "cloud") {
    const runner: ModelRunner | null = mode === "device" ? app.device : app.cloud;
    if (!runner) return;
    setRunning(mode);
    setRecs([]);
    const out: Rec[] = [];
    for (const c of ALL) {
      const rules = scoreRules(c.text, app.config.rules);
      const t0 = performance.now();
      try {
        const text = mode === "cloud" ? redact(c.text).text : c.text;
        const reply = await runner.run(buildUserPrompt(text, rules));
        const ai = parseAiVerdict(reply.text);
        const v = combine(rules, ai, { source: reply.source, thresholds: app.config.rules.thresholds });
        out.push({ text: c.text, score: v.score, level: v.level, aiScore: ai?.score ?? null, source: ai ? reply.source : "RULES", latencyMs: performance.now() - t0 });
      } catch (e) {
        out.push({ text: c.text, score: rules.score, level: rules.level, aiScore: null, source: "RULES", latencyMs: performance.now() - t0, error: String(e) });
      }
      setRecs([...out]);
    }
    setRunning(null);
  }

  function download(name: string) {
    const blob = new Blob([JSON.stringify(recs, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }

  const correct = recs.filter((r, i) => (r.level !== "low") === ALL[i]!.scam).length;
  return (
    <div className="page">
      <h1>Evals (developer)</h1>
      <p className="muted">{ALL.length} labelled messages. Runs each one through the real model in this browser.</p>
      <div className="row">
        <button className="primary" disabled={!!running || !app.device || app.nano !== "available"} onClick={() => void run("device")}>Run on-device</button>
        <button className="primary" disabled={!!running || !app.cloud} onClick={() => void run("cloud")}>Run cloud (redacted)</button>
        <button className="secondary" disabled={!recs.length || !!running} onClick={() => download(`predictions-${recs[0]?.source === "IN_CLOUD" ? "cloud" : "device"}.json`)}>Download predictions</button>
      </div>
      {running && <p>Running {running}… {recs.length}/{ALL.length}</p>}
      {recs.length > 0 && <p>Accuracy so far: {correct}/{recs.length}. Errors: {recs.filter((r) => r.error).length}.</p>}
    </div>
  );
}
