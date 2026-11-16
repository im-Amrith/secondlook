// Eval metrics and scorers. Pure so it can be unit-tested and reused by the web eval page.
import { scoreRules, type Level } from "@secondlook/shared";

export interface Case {
  text: string;
  scam: boolean;
  category?: string;
  lang?: string;
}

export interface Prediction {
  score: number;
  level: Level;
  /** ON_DEVICE | IN_CLOUD | RULES */
  source?: string;
  latencyMs?: number;
}

/** A scorer turns one message into a prediction. Plug in device or cloud scorers later. */
export interface Scorer {
  name: string;
  predict(text: string): Promise<Prediction>;
}

export const rulesScorer: Scorer = {
  name: "rules",
  async predict(text) {
    const t0 = performance.now();
    const r = scoreRules(text);
    return { score: r.score, level: r.level, source: "RULES", latencyMs: performance.now() - t0 };
  },
};

/**
 * Scorer that replays predictions recorded elsewhere (e.g. the web app's eval page, which runs
 * the real Gemini Nano or cloud model in Chrome and downloads a JSON file keyed by text).
 */
export function recordedScorer(name: string, records: { text: string; score: number; level: Level; source?: string; latencyMs?: number }[]): Scorer {
  const byText = new Map(records.map((r) => [r.text, r]));
  return {
    name,
    async predict(text) {
      const r = byText.get(text);
      if (!r) throw new Error(`no recorded prediction for: ${text.slice(0, 60)}`);
      return r;
    },
  };
}

export interface Metrics {
  n: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  accuracy: number;
  f1: number;
  medianLatencyMs: number;
}

export interface Row extends Case {
  pred: Prediction;
  flagged: boolean;
}

/** A message counts as "flagged" when the level is medium or high. */
export const isFlagged = (p: Prediction) => p.level !== "low";

export function metrics(rows: Row[]): Metrics {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const r of rows) {
    if (r.scam && r.flagged) tp++;
    else if (!r.scam && r.flagged) fp++;
    else if (!r.scam && !r.flagged) tn++;
    else fn++;
  }
  const div = (a: number, b: number) => (b === 0 ? 0 : a / b);
  const precision = div(tp, tp + fp);
  const recall = div(tp, tp + fn);
  const lat = rows.map((r) => r.pred.latencyMs ?? 0).sort((a, b) => a - b);
  return {
    n: rows.length, tp, fp, tn, fn,
    precision, recall,
    accuracy: div(tp + tn, rows.length),
    f1: div(2 * precision * recall, precision + recall),
    medianLatencyMs: lat.length ? lat[Math.floor(lat.length / 2)]! : 0,
  };
}

export async function runScorer(scorer: Scorer, cases: Case[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (const c of cases) {
    const pred = await scorer.predict(c.text);
    rows.push({ ...c, pred, flagged: isFlagged(pred) });
  }
  return rows;
}

export function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const ms = (x: number) => (x < 1 ? "<1 ms" : `${Math.round(x)} ms`);

export function metricsRow(label: string, m: Metrics): string {
  return `| ${label} | ${m.n} | ${pct(m.precision)} | ${pct(m.recall)} | ${pct(m.accuracy)} | ${pct(m.f1)} | ${ms(m.medianLatencyMs)} |`;
}

export const METRICS_HEADER = "| Set | N | Precision | Recall | Accuracy | F1 | Median latency |\n|---|---|---|---|---|---|---|";
