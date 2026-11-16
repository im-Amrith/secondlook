// On-device redaction. Runs BEFORE anything is sent to the cloud model.
// Replaces personal identifiers with stable placeholders like [PHONE_1] and reports
// counts by type so the UI can say "3 phone numbers, 1 account number removed".
// The mapping back to the original values stays on the device and is never sent.
import type { Redaction, RedactionType } from "./schema";

export interface RedactionItem {
  type: RedactionType;
  placeholder: string;
  original: string;
}

export interface RedactResult {
  text: string;
  redactions: Redaction[];
  /** Local-only mapping placeholder → original. Never send this anywhere. */
  items: RedactionItem[];
}

export interface RedactOptions {
  /** Extra names to mask (e.g. found by the on-device model). */
  names?: string[];
}

// Not preceded/followed by word chars (keeps us from cutting into longer tokens).
const L = String.raw`(?<![\w@.+])`;
const R = String.raw`(?![\w@])`;

interface Pattern {
  type: RedactionType;
  re: RegExp;
  /** Optional validator on the matched string; return false to leave it alone. */
  valid?: (m: string) => boolean;
  /** Which capture group holds the sensitive part (default: whole match). */
  group?: number;
}

function luhn(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");

// Order matters: more specific patterns run first so e.g. an email isn't seen as a UPI id.
const PATTERNS: Pattern[] = [
  { type: "EMAIL", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g },
  // UPI VPA: handle@psp (no dot-TLD after @), e.g. ramesh.k@okaxis, 9876543210@ybl
  { type: "UPI", re: /[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9]{1,63}(?![\w.@])/g },
  // IBAN: 2 letters, 2 digits, 11-30 alphanumerics (optionally grouped by spaces)
  { type: "IBAN", re: new RegExp(`${L}[A-Z]{2}\\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?${R}`, "g"), valid: (m) => m.replace(/ /g, "").length >= 15 },
  // Payment cards: 13-19 digits, optional spaces/dashes, Luhn-valid
  { type: "CARD", re: new RegExp(`${L}\\d(?:[ -]?\\d){12,18}${R}`, "g"), valid: (m) => luhn(onlyDigits(m)) },
  // Aadhaar: 12 digits, first is 2-9, often grouped 4-4-4
  { type: "AADHAAR", re: new RegExp(`${L}[2-9]\\d{3}[ -]?\\d{4}[ -]?\\d{4}${R}`, "g") },
  // PAN: ABCDE1234F
  { type: "PAN", re: new RegExp(`${L}[A-Z]{3}[PCHFATBLJG][A-Z]\\d{4}[A-Z]${R}`, "g") },
  // Phones: Indian mobiles (+91 / 0 / bare 10-digit starting 6-9), landlines, and +CC international
  {
    type: "PHONE",
    re: new RegExp(
      [
        String.raw`${L}(?:\+|00)91[\s-]?[6-9]\d{4}[\s-]?\d{5}`,
        String.raw`${L}0?[6-9]\d{4}[\s-]?\d{5}${R}`,
        String.raw`${L}[6-9]\d{2}[\s-]\d{3}[\s-]\d{4}${R}`,
        String.raw`${L}(?:\+|00)(?!91)\d{1,3}[\s-]?\(?\d{1,4}\)?(?:[\s-]?\d{2,4}){2,4}`,
        String.raw`${L}0\d{2,4}[\s-]\d{6,8}${R}`,
        String.raw`${L}1800[\s-]?\d{3}[\s-]?\d{3,4}${R}`,
      ].join("|"),
      "g",
    ),
  },
  // Bank account numbers: 9-18 digit runs left after the above
  { type: "ACCOUNT", re: new RegExp(`${L}\\d{9,18}${R}`, "g") },
  // OTP-like codes: 4-8 digits near words like OTP / code / PIN
  { type: "OTP", re: /\b(?:otp|code|pin|password|passcode)\b[^\d\n]{0,20}(\d{4,8})(?!\d)/gi, group: 1 },
  { type: "OTP", re: /(?<!\d)(\d{4,8})(?=\s+is\s+(?:your|the)\s+(?:otp|code|verification|one[- ]time))/gi, group: 1 },
  // Names after a title, or "my name is X" (simple heuristic; the device model can add more)
  {
    type: "NAME",
    re: /\b(?:(?:Mr|Mrs|Ms|Miss|Dr|Shri|Smt|Sri|Kumari|Inspector|Officer|Constable|Sir|Madam)\.?\s+|(?:my name is|i am|i'm|this is)\s+)([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)/g,
    group: 1,
  },
];

const NAME_STOPWORDS = new Set(["The", "From", "Your", "Calling", "Here", "Not", "Very", "Sorry", "Happy", "Going", "Fine", "Good", "Back", "Just", "Also", "Still", "Really", "Sure"]);

export function redact(input: string, opts: RedactOptions = {}): RedactResult {
  let text = input;
  const items: RedactionItem[] = [];
  const counters = new Map<RedactionType, number>();
  const seen = new Map<string, string>(); // `${type}:${normalised}` → placeholder

  const placeholderFor = (type: RedactionType, original: string): string => {
    const digits = onlyDigits(original);
    const norm = type === "PHONE" && digits.length > 10 && /^(91|0|091|0091)/.test(digits) ? digits.slice(-10) : digits;
    const key = `${type}:${type === "NAME" ? original.toLowerCase() : norm || original.toLowerCase()}`;
    const existing = seen.get(key);
    if (existing) return existing;
    const n = (counters.get(type) ?? 0) + 1;
    counters.set(type, n);
    const ph = `[${type}_${n}]`;
    seen.set(key, ph);
    items.push({ type, placeholder: ph, original });
    return ph;
  };

  for (const p of PATTERNS) {
    text = text.replace(p.re, (...args: unknown[]) => {
      const whole = args[0] as string;
      const part = p.group ? (args[p.group] as string | undefined) : whole;
      if (!part) return whole;
      if (part.includes("[") || part.includes("]")) return whole; // already a placeholder
      if (p.valid && !p.valid(part)) return whole;
      if (p.type === "NAME" && NAME_STOPWORDS.has(part.split(/\s+/)[0]!)) return whole;
      const ph = placeholderFor(p.type, part);
      return p.group ? whole.replace(part, ph) : ph;
    });
  }

  for (const name of opts.names ?? []) {
    const n = name.trim();
    if (n.length < 2) continue;
    const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    text = text.replace(re, (m) => placeholderFor("NAME", m));
  }

  const redactions: Redaction[] = [...counters.entries()].map(([type, count]) => ({ type, count }));
  return { text, redactions, items };
}

const NOUNS: Record<RedactionType, [string, string]> = {
  PHONE: ["phone number", "phone numbers"],
  EMAIL: ["email address", "email addresses"],
  UPI: ["UPI ID", "UPI IDs"],
  CARD: ["card number", "card numbers"],
  IBAN: ["IBAN", "IBANs"],
  ACCOUNT: ["account number", "account numbers"],
  OTP: ["code", "codes"],
  AADHAAR: ["Aadhaar number", "Aadhaar numbers"],
  PAN: ["PAN", "PANs"],
  NAME: ["name", "names"],
};

/** "3 phone numbers, 1 account number and 2 names" */
export function describeRedactions(r: Redaction[]): string {
  const parts = r.filter((x) => x.count > 0).map((x) => `${x.count} ${NOUNS[x.type][x.count === 1 ? 0 : 1]}`);
  if (parts.length === 0) return "nothing personal found";
  return parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

export const totalRedactions = (r: Redaction[]) => r.reduce((a, x) => a + x.count, 0);
