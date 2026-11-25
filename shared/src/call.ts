// Call Guard: scam signals while a call is still going on.
//
// "Digital arrest" and bank-fraud calls happen live, often over hours, so a checker you paste a
// message into comes too late. Two ways in, both platform-independent and testable here:
//  1. A live transcript (speech recognised ON THE DEVICE, see web/src/lib/listen.ts). Signals are
//     sticky: once a caller has said "digital arrest", that stays on screen even after the words
//     scroll away.
//  2. Quick yes/no questions, for when listening isn't possible (no on-device speech model, a
//     phone call on another handset, or the person would rather tap).
// Nothing in this file sends anything anywhere.
import { DEFAULT_THRESHOLDS, levelFor, type Level, type SignalId } from "./schema";
import { adviceFor, explanationFor, probOr, scoreRules, type RuleHit, type RulesOptions } from "./rules";

/** One short, big-type warning per kind of signal, in order of how much it matters on a call. */
export const CALL_WARNINGS: { ruleIds: string[]; warning: string }[] = [
  { ruleIds: ["video_custody"], warning: "There is no such thing as a \"digital arrest\". Real police never arrest anyone on a video call. Hang up." },
  { ruleIds: ["safe_account"], warning: "No police, court or bank ever asks you to move money to a \"safe\" account. Don't transfer anything." },
  { ruleIds: ["credentials"], warning: "Never tell anyone a code, OTP, PIN or password, not even someone who says they're from the bank." },
  { ruleIds: ["remote_access"], warning: "Don't install any app or share your screen because a caller asked you to." },
  { ruleIds: ["call_pressure"], warning: "Someone on the phone is telling you to pay. That's how most scams work. Hang up first, then decide." },
  { ruleIds: ["secrecy"], warning: "They told you to keep it secret or stay on the call. That's how scammers stop anyone warning you. You can hang up." },
  { ruleIds: ["authority"], warning: "Real police, CBI, customs and courts never ask for money on a call." },
  { ruleIds: ["gift_card_crypto"], warning: "Nobody real asks to be paid in gift cards or crypto. Don't buy any." },
  { ruleIds: ["payment_demand", "advance_fee", "ff_request"], warning: "Don't send money while you're on this call. Hang up and check first." },
  { ruleIds: ["utility_threat", "account_block"], warning: "Services and banks don't cut you off over a phone call. Hang up and call the number on your bill or card." },
  { ruleIds: ["urgency"], warning: "They're rushing you. Scammers rush. You're allowed to slow down and hang up." },
];

export interface CallSignal extends RuleHit {
  /** When it was first heard (ms since the call guard started). */
  at: number;
}

export interface CallState {
  /** Recent transcript lines (newest last), capped. Kept only in memory. */
  lines: { text: string; at: number }[];
  /** Every rule that has fired during this call, first occurrence only. */
  signals: CallSignal[];
  score: number;
  level: Level;
  /** The most important warning to show now, or null. */
  warning: string | null;
  /** Rule id that produced `warning`. */
  warningRule: string | null;
  explanation: string;
  advice: string;
}

const MAX_LINES = 60;
/** Phrases can be split across recognition results, so rules also look at the last few lines together. */
const WINDOW_CHARS = 600;

export function createCallState(): CallState {
  return { lines: [], signals: [], score: 0, level: "low", warning: null, warningRule: null, explanation: explanationFor("low", []), advice: adviceFor("low", []) };
}

export function warningFor(signals: { ruleId: string }[]): { warning: string; ruleId: string } | null {
  for (const w of CALL_WARNINGS) {
    const hit = signals.find((s) => w.ruleIds.includes(s.ruleId));
    if (hit) return { warning: w.warning, ruleId: hit.ruleId };
  }
  return null;
}

function summarise(signals: CallSignal[], thresholds: { medium: number; high: number } = DEFAULT_THRESHOLDS): Omit<CallState, "lines" | "signals"> {
  const score = Math.round(Math.min(1, probOr(signals.map((s) => s.weight))) * 100);
  const level = levelFor(score, thresholds);
  const w = warningFor(signals);
  return { score, level, warning: w?.warning ?? null, warningRule: w?.ruleId ?? null, explanation: explanationFor(level, signals), advice: adviceFor(level, signals) };
}

/** Add a piece of recognised speech. Pure: returns a new state. */
export function addTranscript(state: CallState, text: string, at: number, opts: RulesOptions = {}): CallState {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return state;
  const lines = [...state.lines, { text: clean, at }].slice(-MAX_LINES);
  // Look at the new line plus the tail of what came before, so "you are under digital" + "arrest" still matches.
  const window = lines.map((l) => l.text).join(" ").slice(-WINDOW_CHARS);
  const found = scoreRules(window, opts).signals;
  const signals = [...state.signals];
  for (const f of found) {
    if (!signals.some((s) => s.ruleId === f.ruleId)) signals.push({ ...f, at });
  }
  signals.sort((a, b) => b.weight - a.weight);
  return { lines, signals, ...summarise(signals, opts.thresholds) };
}

/** Questions for the tap-only mode and the "pause before paying" screen. */
export interface CallQuestion {
  id: string;
  /** English text; the web app translates by id. */
  text: string;
  /** The rule a "yes" counts as. */
  ruleId: string;
  category: SignalId;
  label: string;
  why: string;
  weight: number;
  /** Only asked on the pause-before-paying screen (on a call, the answer is obviously yes). */
  pauseOnly?: boolean;
}

export const CALL_QUESTIONS: CallQuestion[] = [
  { id: "oncall", text: "Is someone on the phone or a video call telling you to make this payment?", ruleId: "call_pressure", category: "urgency", label: "Someone on a call is telling you to pay", why: "Being told to pay while on a call is the most common sign of a scam.", weight: 0.45, pauseOnly: true },
  { id: "authority", text: "Do they say they're from the police, CBI, customs, a court, or your bank?", ruleId: "authority", category: "authority", label: "Claims to be police, court, bank or government", why: "Police, courts and banks never demand money or codes over a call.", weight: 0.45 },
  { id: "arrest", text: "Do they say you're under arrest, or that you must stay on a video call?", ruleId: "video_custody", category: "authority", label: "\"Digital arrest\" or video-call custody", why: "There is no such thing as a 'digital arrest'.", weight: 0.55 },
  { id: "secret", text: "Did they tell you not to tell your family, or not to hang up?", ruleId: "secrecy", category: "secrecy", label: "Tells you to keep it secret", why: "Secrecy is how scammers stop anyone from warning you.", weight: 0.5 },
  { id: "money", text: "Are they asking you to send money, or move it to a \"safe\" account?", ruleId: "safe_account", category: "money_request", label: "Asks you to send or move money", why: "No real official asks you to move your money to keep it safe.", weight: 0.55 },
  { id: "code", text: "Are they asking for an OTP, PIN or password, or to install an app?", ruleId: "credentials", category: "credentials", label: "Asks for a code or an app", why: "No real bank or official ever needs your codes or your screen.", weight: 0.6 },
  { id: "rush", text: "Are they rushing you, or threatening something bad if you don't act now?", ruleId: "urgency", category: "urgency", label: "Pressure to act fast", why: "Scammers rush you so you don't stop and check.", weight: 0.2 },
];

/** The three questions shown on the pause-before-paying screen. */
export const PAUSE_QUESTION_IDS = ["oncall", "secret", "authority", "rush"] as const;

export interface AnswersResult {
  score: number;
  level: Level;
  signals: RuleHit[];
  warning: string | null;
  warningRule: string | null;
  explanation: string;
  advice: string;
}

/** Score yes/no answers the same way the rules score text. */
export function scoreAnswers(yes: Iterable<string>, thresholds: { medium: number; high: number } = DEFAULT_THRESHOLDS): AnswersResult {
  const ids = new Set(yes);
  const signals: RuleHit[] = CALL_QUESTIONS.filter((q) => ids.has(q.id)).map((q) => ({
    ruleId: q.ruleId,
    id: q.category,
    label: q.label,
    why: q.why,
    weight: q.weight,
    excerpt: "",
  }));
  signals.sort((a, b) => b.weight - a.weight);
  const score = Math.round(probOr(signals.map((s) => s.weight)) * 100);
  const level = levelFor(score, thresholds);
  const w = warningFor(signals);
  return { score, level, signals, warning: w?.warning ?? null, warningRule: w?.ruleId ?? null, explanation: explanationFor(level, signals), advice: adviceFor(level, signals) };
}
