// The prompt shared by the on-device (Gemini Nano) and cloud models.
// Short on purpose: on-device context is small and outputs should stay under ~256 tokens.
import { AI_VERDICT_JSON_SCHEMA, SIGNAL_IDS } from "./schema";
import type { RulesResult } from "./rules";

export const PROMPT_VERSION = "v1";

/** Output cap for the model. JSON verdict fits comfortably in this. */
export const MAX_OUTPUT_TOKENS = 256;

export const SYSTEM_PROMPT = `You help older people spot scams. Read the message and judge how likely it is to be a scam.
Common scam patterns: fake police/court/CBI or "digital arrest", bank KYC or account-block threats, electricity cut-off, parcel or customs fees, prizes, easy-money jobs, romance asking for money, requests for OTPs or PINs, gift cards or crypto, "don't tell your family", "stay on the call", pressure to act now.
Normal messages from family, shops, banks' real alerts without links or requests, and delivery updates are usually safe.
Placeholders like [PHONE_1] are personal details removed for privacy; ignore them.
Reply ONLY with JSON: {"score":0-100,"level":"low|medium|high","signals":[{"id":one of ${SIGNAL_IDS.join("|")},"excerpt":"few words"}],"explanation":"2 short plain sentences","advice":"1 sentence: what to do now"}.
Use simple words. No more than 4 signals.`;

/** Builds the user turn. Rule findings are a hint, not a verdict, so the model can disagree. */
export function buildUserPrompt(text: string, rules?: Pick<RulesResult, "signals" | "score">, opts: { maxChars?: number } = {}): string {
  const max = opts.maxChars ?? 6000;
  const body = text.length > max ? text.slice(0, max) + " …[cut]" : text;
  const hint = rules
    ? `Quick rules found: ${rules.signals.map((s) => s.label).join(", ") || "nothing"} (score ${rules.score}).\n`
    : "";
  return `${hint}Message:\n"""${body}"""`;
}

export const IMAGE_PROMPT = "This is a screenshot of a message or web page. Read it and judge whether it is a scam.";

export { AI_VERDICT_JSON_SCHEMA as VERDICT_RESPONSE_SCHEMA };

/** Rough token estimate (≈4 chars per token for English; scripts like Devanagari are denser). */
export function estimateTokens(text: string): number {
  let nonLatin = 0;
  for (const ch of text) if (ch.charCodeAt(0) > 0x2ff) nonLatin++;
  const latin = text.length - nonLatin;
  return Math.ceil(latin / 4 + nonLatin / 1.5);
}

/** Follow-up questions ("What should I do now?"). Plain text, short. */
export const FOLLOWUP_SYSTEM_PROMPT = `You help an older person who received a message that may be a scam. Answer their question in at most 4 short sentences, in plain words.
Never ask for personal details, codes or money. If they may already have paid or shared a code, tell them to call their bank on the number on their card right away and report it (in India: call 1930 or visit cybercrime.gov.in).
Placeholders like [PHONE_1] are personal details removed for privacy.`;

export function buildFollowUpPrompt(original: string, verdictSummary: string, question: string): string {
  return `The message they received:\n"""${original.slice(0, 4000)}"""\nOur check said: ${verdictSummary}\nTheir question: ${question}`;
}

/**
 * Used only when a check must go to the cloud but Gemini Nano is available: the on-device model
 * finds people's names so they can be masked too (regex only catches names after titles).
 */
export const NAMES_SYSTEM_PROMPT = 'Find the names of real people in the message (not companies, places or job titles). Reply ONLY with JSON: {"names": ["..."]}. If there are none, reply {"names": []}.';

export const NAMES_JSON_SCHEMA = {
  type: "object",
  properties: { names: { type: "array", maxItems: 10, items: { type: "string", maxLength: 40 } } },
  required: ["names"],
} as const;

/** Keep only plausible names that really occur in the text. */
export function parseNames(raw: string, text: string): string[] {
  let v: unknown;
  try {
    v = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""));
  } catch {
    return [];
  }
  const names = (v as { names?: unknown })?.names;
  if (!Array.isArray(names)) return [];
  return [...new Set(names.filter((n): n is string => typeof n === "string").map((n) => n.trim()))]
    .filter((n) => n.length >= 2 && n.length <= 40 && text.includes(n) && /\p{L}/u.test(n))
    .slice(0, 10);
}
