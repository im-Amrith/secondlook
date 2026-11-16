// Merge the rules result (Tier 0) with an AI verdict (Tier 1 or 2) into the final Verdict.
import { adviceFor, type RulesResult } from "./rules";
import { DEFAULT_THRESHOLDS, levelFor, type AiVerdict, type Level, type Redaction, type SignalId, type Verdict, type VerdictSignal, type VerdictSource } from "./schema";

export const SIGNAL_LABELS: Record<SignalId, { label: string; why: string }> = {
  authority: { label: "Pretends to be an official", why: "Police, courts, banks and tax offices don't demand money or codes over chat or calls." },
  urgency: { label: "Pressure to act fast", why: "Scammers rush you so you don't stop and check." },
  secrecy: { label: "Tells you to keep it secret", why: "Being told not to tell anyone is how scammers stop others from warning you." },
  money_request: { label: "Asks for money", why: "Any request to send money from someone you can't verify deserves a pause." },
  credentials: { label: "Asks for a code or password", why: "No one genuine ever needs your OTP, PIN or password." },
  link: { label: "Suspicious link", why: "Links in unexpected messages often lead to fake pages." },
  romance: { label: "Romance and money", why: "Online partners asking for money is a common scam." },
  prize: { label: "Prize or too-good offer", why: "Real prizes don't charge a fee, and real deals aren't 'too good to be true'." },
  job: { label: "Easy-money job", why: "Jobs that pay well for simple tasks, then ask you to pay, are a trap." },
  overpayment: { label: "Overpayment trick", why: "Being asked to refund 'extra' money is a classic scam." },
  off_platform: { label: "Moves you to another app", why: "Moving to WhatsApp, Telegram or a video call removes protections." },
};

const LEVEL_RANK: Record<Level, number> = { low: 0, medium: 1, high: 2 };

export interface CombineOptions {
  source: VerdictSource;
  redactions?: Redaction[];
  thresholds?: { medium: number; high: number };
}

/**
 * The AI may raise the risk freely (it can read screenshots and context), but may only lower
 * it a little, so a confident rule hit can't be talked away by clever wording in the message.
 */
export function combineScores(rulesScore: number, aiScore: number): number {
  const ai = Math.min(100, Math.max(0, aiScore));
  return ai >= rulesScore ? Math.round(0.4 * rulesScore + 0.6 * ai) : Math.max(rulesScore - 10, Math.round((rulesScore + ai) / 2));
}

export function combine(rules: RulesResult, ai: AiVerdict | null, opts: CombineOptions): Verdict {
  const thresholds = opts.thresholds ?? DEFAULT_THRESHOLDS;
  const ruleSignals: VerdictSignal[] = rules.signals.map((s) => ({ id: s.id, excerpt: s.excerpt, label: s.label, why: s.why, from: "rules" }));

  if (!ai) {
    return {
      score: rules.score,
      level: rules.level,
      signals: ruleSignals,
      explanation: rules.explanation,
      advice: rules.advice,
      source: "RULES",
      redactions: [],
    };
  }

  const score = combineScores(rules.score, ai.score);
  const level = levelFor(score, thresholds);
  const have = new Set(ruleSignals.map((s) => s.id));
  const aiSignals: VerdictSignal[] = [];
  for (const s of ai.signals) {
    if (have.has(s.id)) continue;
    have.add(s.id);
    aiSignals.push({ id: s.id, excerpt: s.excerpt, label: SIGNAL_LABELS[s.id].label, why: SIGNAL_LABELS[s.id].why, from: "ai" });
  }
  const signals = [...ruleSignals, ...aiSignals];

  // Use the model's words when it agrees with the final level; otherwise our own safe advice.
  const aiAgrees = LEVEL_RANK[ai.level] >= LEVEL_RANK[level];
  const advice = ai.advice && aiAgrees ? ai.advice : adviceFor(level, [...rules.signals, ...aiSignals]);
  const explanation = ai.explanation || rules.explanation;

  return {
    score,
    level,
    signals,
    explanation,
    advice,
    source: opts.source,
    redactions: opts.source === "IN_CLOUD" ? (opts.redactions ?? []) : [],
  };
}

/** For long inputs checked in pieces: keep the most worrying piece, union the signals. */
export function mergeChunkVerdicts(parts: AiVerdict[]): AiVerdict | null {
  if (parts.length === 0) return null;
  const top = parts.reduce((a, b) => (b.score > a.score ? b : a));
  const seen = new Set<string>();
  const signals = parts.flatMap((p) => p.signals).filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true))).slice(0, 5);
  return { ...top, signals };
}
