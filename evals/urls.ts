// Banner eval: on a page with a password field, does the extension warn on look-alike login URLs
// and stay quiet on real ones? Uses shared/url.ts, the same code as the content script.
import { scoreUrl } from "@secondlook/shared";

export interface UrlCase {
  url: string;
  phish: boolean;
}

export function urlEvalMarkdown(cases: UrlCase[]): string {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const misses: string[] = [];
  for (const c of cases) {
    const r = scoreUrl(c.url, { hasPasswordField: true });
    if (c.phish && r.warn) tp++;
    else if (!c.phish && r.warn) { fp++; misses.push(`- **false alarm** (score ${r.score}): ${c.url}`); }
    else if (!c.phish && !r.warn) tn++;
    else { fn++; misses.push(`- **missed** (score ${r.score}): ${c.url}`); }
  }
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "n/a");
  return [
    "## Extension banner (look-alike login pages)",
    "",
    `${cases.length} login-page URLs (${cases.filter((c) => c.phish).length} look-alikes written in common Indian phishing styles, ${cases.filter((c) => !c.phish).length} real sites), each assumed to show a password field. Scored by shared/url.ts, the same local rules the content script runs. Hand-written, not a live phishing feed. The first run had one false alarm (Microsoft's real login.microsoftonline.com); its domain was added to the official list.`,
    "",
    "| Precision | Recall | Accuracy | False alarms on real sites |",
    "|---|---|---|---|",
    `| ${pct(tp, tp + fp)} | ${pct(tp, tp + fn)} | ${pct(tp + tn, cases.length)} | ${fp}/${fp + tn} |`,
    "",
    ...(misses.length ? ["Misses:", "", ...misses, ""] : []),
  ].join("\n");
}
