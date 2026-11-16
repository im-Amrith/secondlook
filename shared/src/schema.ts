// The verdict every surface (web, extension, later Android) shows to the user.
// Same shape everywhere so evals, UI and family alerts can share one type.

export const SIGNAL_IDS = [
  "authority",
  "urgency",
  "secrecy",
  "money_request",
  "credentials",
  "link",
  "romance",
  "prize",
  "job",
  "overpayment",
  "off_platform",
] as const;

export type SignalId = (typeof SIGNAL_IDS)[number];

export type Level = "low" | "medium" | "high";

/** Which path produced the verdict. Mirrors Firebase AI Logic's `inferenceSource`, plus RULES. */
export type VerdictSource = "ON_DEVICE" | "IN_CLOUD" | "RULES";

export type RedactionType =
  | "PHONE"
  | "EMAIL"
  | "UPI"
  | "CARD"
  | "IBAN"
  | "ACCOUNT"
  | "OTP"
  | "AADHAAR"
  | "PAN"
  | "NAME";

export interface Redaction {
  type: RedactionType;
  count: number;
}

export interface VerdictSignal {
  /** Category id from SIGNAL_IDS. */
  id: SignalId;
  /** Short words from the message that triggered it (may be redacted). */
  excerpt: string;
  /** Plain-language label, e.g. "Claims to be the police". */
  label?: string;
  /** One sentence on why this matters. */
  why?: string;
  /** Which detector found it. */
  from?: "rules" | "ai";
}

export interface Verdict {
  score: number; // 0-100
  level: Level;
  signals: VerdictSignal[];
  explanation: string;
  advice: string;
  source: VerdictSource;
  /** What was removed before sending to the cloud. Empty for ON_DEVICE / RULES. */
  redactions: Redaction[];
}

/** What the AI model must return (the rest of Verdict is filled in by combine.ts). */
export interface AiVerdict {
  score: number;
  level: Level;
  signals: { id: SignalId; excerpt: string }[];
  explanation: string;
  advice: string;
}

/**
 * JSON schema (plain JSON Schema / OpenAPI subset) for the AI verdict. Kept small so the
 * on-device model can fill it within ~256 output tokens. Converted to the Firebase
 * `Schema` type in the web app, and passed as `responseConstraint` to the Prompt API.
 */
export const AI_VERDICT_JSON_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    level: { type: "string", enum: ["low", "medium", "high"] },
    signals: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: [...SIGNAL_IDS] },
          excerpt: { type: "string", maxLength: 80 },
        },
        required: ["id", "excerpt"],
      },
    },
    explanation: { type: "string", maxLength: 300 },
    advice: { type: "string", maxLength: 160 },
  },
  required: ["score", "level", "signals", "explanation", "advice"],
} as const;

export function levelFor(score: number, thresholds: { medium: number; high: number } = DEFAULT_THRESHOLDS): Level {
  return score >= thresholds.high ? "high" : score >= thresholds.medium ? "medium" : "low";
}

export const DEFAULT_THRESHOLDS = { medium: 30, high: 60 } as const;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * Validate and normalise untrusted model output. Returns null if it is unusable.
 * Small models sometimes return out-of-range numbers or unknown ids; we clamp and drop.
 */
export function parseAiVerdict(raw: unknown): AiVerdict | null {
  let v: unknown = raw;
  if (typeof v === "string") {
    const s = v.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    try {
      v = JSON.parse(s);
    } catch {
      return null;
    }
  }
  if (!isObj(v)) return null;
  const n = Number(v.score);
  if (!Number.isFinite(n)) return null;
  const score = Math.round(Math.min(100, Math.max(0, n)));
  const level: Level = v.level === "low" || v.level === "medium" || v.level === "high" ? v.level : levelFor(score);
  const signals = Array.isArray(v.signals)
    ? v.signals
        .filter(isObj)
        .filter((s) => (SIGNAL_IDS as readonly string[]).includes(String(s.id)))
        .slice(0, 5)
        .map((s) => ({ id: s.id as SignalId, excerpt: String(s.excerpt ?? "").slice(0, 120) }))
    : [];
  return {
    score,
    level,
    signals,
    explanation: typeof v.explanation === "string" ? v.explanation.slice(0, 500) : "",
    advice: typeof v.advice === "string" ? v.advice.slice(0, 300) : "",
  };
}
