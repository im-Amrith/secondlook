// Redaction eval: does every personal identifier disappear before the cloud, and does the text the
// model needs (amounts, times, scam keywords) survive?
import { redact, type RedactionType } from "@secondlook/shared";

export interface PiiCase {
  text: string;
  pii: { type: RedactionType; value: string }[];
  keep: string[];
}

export interface PiiReport {
  cases: number;
  identifiers: number;
  removed: number;
  /** Identifier removed but filed under another type (still private, just mislabelled). */
  mislabelled: number;
  kept: number;
  keepTotal: number;
  byType: Map<string, { total: number; removed: number }>;
  leaks: string[];
  overRedactions: string[];
}

export function runPiiEval(cases: PiiCase[]): PiiReport {
  const byType = new Map<string, { total: number; removed: number }>();
  const leaks: string[] = [];
  const overRedactions: string[] = [];
  let identifiers = 0, removed = 0, kept = 0, keepTotal = 0, mislabelled = 0;
  for (const c of cases) {
    const r = redact(c.text);
    for (const p of c.pii) {
      identifiers++;
      const t = byType.get(p.type) ?? { total: 0, removed: 0 };
      t.total++;
      const gone = !r.text.includes(p.value);
      if (gone) {
        removed++;
        t.removed++;
        const item = r.items.find((i) => i.original.includes(p.value) || p.value.includes(i.original));
        if (item && item.type !== p.type) mislabelled++;
      } else leaks.push(`${p.type} "${p.value}" in: ${c.text.slice(0, 80)}`);
      byType.set(p.type, t);
    }
    for (const k of c.keep) {
      keepTotal++;
      if (r.text.includes(k)) kept++;
      else overRedactions.push(`"${k}" lost → ${r.text.slice(0, 100)}`);
    }
  }
  return { cases: cases.length, identifiers, removed, mislabelled, kept, keepTotal, byType, leaks, overRedactions };
}

export function piiMarkdown(r: PiiReport): string {
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "n/a");
  const lines = [
    "## Redaction (what reaches the cloud)",
    "",
    `${r.cases} messages with ${r.identifiers} labelled identifiers, plus ${r.keepTotal} phrases the model still needs (amounts, times, scam words). Run by \`redact()\` from shared/redact.ts, the same code the app runs before every cloud call.`,
    "",
    "> Caveat: written by the same author as the redactor. The first run leaked 2 of 26 identifiers (a UPI ID at the end of a sentence, and a name after a capitalised \"I am\"); both patterns were fixed. Names are only caught after titles and introductions; the plan is to add on-device name masking with Nano.",
    "",
    "| Measure | Result |",
    "|---|---|",
    `| Identifiers removed | ${r.removed}/${r.identifiers} (${pct(r.removed, r.identifiers)}) |`,
    `| Useful phrases kept | ${r.kept}/${r.keepTotal} (${pct(r.kept, r.keepTotal)}) |`,
    `| Removed but filed under another type | ${r.mislabelled} |`,
    "",
    "| Type | Removed |",
    "|---|---|",
    ...[...r.byType.entries()].sort().map(([t, v]) => `| ${t} | ${v.removed}/${v.total} |`),
    "",
  ];
  if (r.leaks.length) lines.push("Leaks:", "", ...r.leaks.map((l) => `- ${l}`), "");
  if (r.overRedactions.length) lines.push("Over-redactions:", "", ...r.overRedactions.map((l) => `- ${l}`), "");
  return lines.join("\n");
}
