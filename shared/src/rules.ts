// Tier 0: deterministic rules. Instant, offline, explainable and testable.
// Ported from im-Amrith/shield-paypal-ai (lib/scam.ts): the 16 weighted rules and the
// probabilistic-OR score are kept; advice is now generic (not PayPal-specific), and new
// rules cover secrecy/isolation and video-call "digital arrest" custody, plus a few
// Hindi / Malayalam terms (Latin script and Devanagari).
import { DEFAULT_THRESHOLDS, levelFor, type Level, type SignalId } from "./schema";

export interface Rule {
  /** Stable rule id (used for weight overrides from Remote Config). */
  id: string;
  /** Which verdict signal category this rule feeds. */
  category: SignalId;
  label: string;
  why: string;
  weight: number;
  re: RegExp;
}

export interface RuleHit {
  ruleId: string;
  id: SignalId;
  label: string;
  why: string;
  weight: number;
  excerpt: string;
}

export interface RulesResult {
  score: number;
  level: Level;
  signals: RuleHit[];
  explanation: string;
  advice: string;
}

/** A rule pushed at runtime (e.g. Remote Config "scam of the week"). Pattern is a regex source. */
export interface ExtraRuleSpec {
  id: string;
  category: SignalId;
  label: string;
  why: string;
  weight: number;
  pattern: string;
}

export interface RulesOptions {
  /** Override weights by rule id (0..0.95). Unknown ids are ignored. */
  weights?: Record<string, number>;
  thresholds?: { medium: number; high: number };
  extraRules?: ExtraRuleSpec[];
}

export const RULES: Rule[] = [
  // ---- the 16 rules from shield-paypal-ai (wording made generic) ----
  {
    id: "ff_request", category: "money_request", label: "Asks for a payment with no protection", weight: 0.45,
    why: "\"Friends & family\" or gift-style payments can't be reversed, so you can't get your money back if it's a scam.",
    re: /friends?\s*(&|and|n)\s*family|\bf\s?&\s?f\b|\bfnf\b|gift(ed)? payment|send (it )?as (a )?(gift|friend)|personal payment|(avoid|save|skip|no) (the )?(paypal )?fees?/i,
  },
  {
    id: "credentials", category: "credentials", label: "Asks for a code or password", weight: 0.6,
    why: "No real bank, company, official or buyer ever needs your OTP, PIN or password.",
    re: /\b(otp|one[- ]time (password|code)|verification code|security code|upi pin|atm pin|share (your|the) pin|passwords?|login details|cvv)\b|otp (batao|bhejo|bata do|share karo|paranju tharu)|ओटीपी|ഒടിപി/i,
  },
  {
    id: "overpayment", category: "overpayment", label: "Overpayment or refund-the-difference", weight: 0.5,
    why: "Overpaying and asking you to send back the difference is a classic trick; the first payment is reversed later.",
    re: /over ?pa(id|y|yment)|sent (you )?(extra|more than)|refund (me )?the (difference|extra|balance)|send (me )?back the (extra|difference|balance)|(sent|transferred) .{0,20}by mistake/i,
  },
  {
    id: "gift_card_crypto", category: "money_request", label: "Gift cards or crypto", weight: 0.5,
    why: "Gift cards and crypto can't be reversed. Real companies and government offices never ask for them.",
    re: /gift ?cards?|itunes|google play (card|code)|steam (card|wallet)|amazon (card|voucher)|bitcoin|\bcrypto|\busdt\b|\bbtc\b|binance/i,
  },
  {
    id: "authority", category: "authority", label: "Claims to be police, court or government", weight: 0.45,
    why: "Police, courts, customs and tax offices never demand money over chat or a call, and never threaten arrest to get it.",
    re: /tax (office|department|officer)|income tax|\birs\b|\bhmrc\b|\bpolice\b|arrest|warrant|customs (fee|duty|clearance|department|officer)|\bcourt\b|legal action|\bcbi\b|\bnarcotics\b|\bncb\b|\btrai\b|enforcement directorate|\bed officer|money laundering|digital arrest|parcel (has been |was |is )?(seized|held)|giraft?aar?|पुलिस|गिरफ्तार|सीबीआई|वारंट|मनी लॉन्ड्रिंग|ड्रग्स|पार्सल|കസ്റ്റംസ്|പോലീസ്|അറസ്റ്റ|സിബിഐ/i,
  },
  {
    id: "prize", category: "prize", label: "Prize or lottery", weight: 0.45,
    why: "You can't win a prize you never entered, and real prizes never charge a fee to release.",
    re: /you('ve| have)? won|lottery|lucky draw|claim (your )?(prize|reward)|processing fee to release|release (the )?(prize|funds)|इनाम|लॉटरी/i,
  },
  {
    id: "romance", category: "romance", label: "Romance and money", weight: 0.4,
    why: "Someone you've only met online asking for money for an emergency is the core pattern of romance scams.",
    re: /my (love|darling|sweetheart|dear(est)?)|i love you|soul ?mate|marry you|stuck at (the )?airport|hospital bills?|visa fee|send (me )?money (so i can|to) (come|see)/i,
  },
  {
    id: "utility_threat", category: "urgency", label: "Threat to cut a service", weight: 0.4,
    why: "Electricity, gas and phone companies don't threaten same-day disconnection by SMS and ask you to call an 'officer'.",
    re: /(electricity|power|gas|water|mobile|sim|connection|number)( supply| service)? (will be |is being |shall be )?(disconnect|cut|block|suspend|deactivat)|disconnection (tonight|today)|bijli (kat|cut)|बिजली .{0,10}(कट|काट)/i,
  },
  {
    id: "job_scam", category: "job", label: "Easy-money job offer", weight: 0.35,
    why: "Jobs that pay a lot for simple online tasks, and then ask you to pay first, are a common trap.",
    re: /work from home.*earn|earn (rs\.? ?|₹|\$)?\d[\d,]* (daily|per day|a day)|liking (videos|posts)|(like|rate|review) (youtube )?(videos|hotels|products) (and|to) earn|task[- ]based (job|work)|prepaid tasks?|guaranteed returns?|part[- ]time job.{0,40}(earn|daily|₹|rs)/i,
  },
  {
    id: "suspicious_link", category: "link", label: "Suspicious link", weight: 0.4,
    why: "Shortened or look-alike links often lead to fake pages that steal your login or card.",
    re: /(bit\.ly|tinyurl\.com|t\.me|rb\.gy|cutt\.ly|is\.gd|shorturl\.at|tiny\.cc)\/|paypa1|pay-?pal[-_.](?!com\b)[a-z0-9-]+\.[a-z]{2,}|paypal\.[a-z]+-[a-z]+|\b[a-z0-9]+(-[a-z0-9]+)*-(kyc|verify|secure|update|login|refund|reward|pay)[a-z0-9-]*\.[a-z]{2,}|\b(kyc|verify|secure|update|login|refund|reward)-[a-z0-9-]+\.[a-z]{2,}|https?:\/\/\d{1,3}(\.\d{1,3}){3}/i,
  },
  {
    id: "shipping_agent", category: "off_platform", label: "Third-party \"agent\" or courier", weight: 0.3,
    why: "A buyer who sends their own courier or 'agent' usually plans to claim the item never arrived.",
    re: /(my|our) (shipping |courier )?agent|courier will (collect|pick)|pick ?up agent|shipping company will (contact|email)|my shipper/i,
  },
  {
    id: "advance_fee", category: "money_request", label: "Pay upfront / fee first", weight: 0.25,
    why: "Being asked to pay a token, deposit or 'fee' before you get anything is common in job, loan and rental scams.",
    re: /advance (payment|fee)|token amount|booking amount|(pay|send) (a )?deposit (first|before)|pay (first|upfront|in advance)|registration fee|security fee|processing fee|clearance fee|verification fee/i,
  },
  {
    id: "urgency", category: "urgency", label: "Pressure to act fast", weight: 0.2,
    why: "Scammers rush you so you don't stop and check with someone.",
    re: /\burgent(ly)?\b|immediately|right now|within (the next )?\d+ ?(min|mins|minutes|hours?|hrs?)|today only|last chance|act fast|hurry|\basap\b|before (it'?s )?too late|or else|\bturant\b|\bjaldi\b|abhi ke abhi|\budane\b|\bpettennu\b|\bpettannu\b|तुरंत|जल्दी/i,
  },
  {
    id: "off_platform", category: "off_platform", label: "Moves you to another app", weight: 0.15,
    why: "Moving the chat to WhatsApp, Telegram or a video call takes you away from places that can protect you.",
    re: /whats ?app|telegram|signal app|text me (at|on)|email me (at|on)|contact me (on|at)|call me (on|at)|download (the )?(anydesk|teamviewer|quick ?support)|\banydesk\b/i,
  },
  {
    id: "unverifiable", category: "off_platform", label: "Can't meet or be checked", weight: 0.2,
    why: "Someone who is always 'abroad' or 'on deployment' can't be checked and won't be reachable later.",
    re: /(i('| a)?m|currently) (abroad|overseas|offshore|on a ship|deployed|out of (the )?country)|can'?t (meet|talk on the phone|video call)|lost my phone.{0,40}new number|this is my new number/i,
  },
  {
    id: "too_good", category: "prize", label: "Too good to be true", weight: 0.2,
    why: "Far-below-market prices and 'guaranteed' high returns are bait.",
    re: /(way |far )?below (market|retail)|too good to be true|almost free|\b(80|85|90|95)% off|half (the )?price.*(sealed|brand new)|(sealed|brand new).*half (the )?price|double your money|\b\d{2,3}% (returns?|profit) (in|within|per) (a )?(day|week|month)/i,
  },

  // ---- new for SecondLook ----
  {
    id: "secrecy", category: "secrecy", label: "Tells you to keep it secret", weight: 0.5,
    why: "Being told not to tell your family or bank, or to stay on the call, is how scammers stop anyone from warning you.",
    re: /(don'?\s?t|do not|never) let (anyone|anybody|your family|others) know|(don'?\s?t|do not|never) (tell|inform|share (this )?with|discuss (this )?with) (anyone|anybody|your (family|son|daughter|wife|husband|children|bank|relatives|friends))|keep (this|it) (a )?(secret|confidential|between us)|(stay|remain) on (the )?(call|line|video)|(do not|don'?t) (disconnect|hang up|cut the call|leave the call)|confidential (investigation|matter|case)|kisi ko (bhi )?(mat|na|nahi) bata|kisi se (bhi )?(baat )?mat kar|aarod(um|o) parayar?uth|aarodum parayalle|किसी को (भी )?(मत|न|ना) बता|किसी से (बात )?मत|(फ़ोन|फोन|कॉल) (मत|न) काट|वीडियो (कॉल )?(पर|में) (ही )?रह|ആരോടും പറയരുത്|ഫോൺ കട്ട് ചെയ്യരുത്/i,
  },
  {
    id: "video_custody", category: "authority", label: "\"Digital arrest\" or video-call custody", weight: 0.55,
    why: "There is no such thing as a 'digital arrest'. Real police never keep you on a video call or hold you 'in custody' online.",
    re: /digital(ly)? arrest|(video|skype|zoom|whatsapp) (call )?(custody|interrogation|verification|statement)|under (online |video |digital )?(surveillance|custody|investigation)|(keep|turn) (your )?camera on|virtual (custody|arrest|court)|डिजिटल अरेस्ट|कैमरा (ऑन|चालू)|ഡിജിറ്റൽ അറസ്റ്റ/i,
  },
  {
    id: "account_block", category: "urgency", label: "Says your account will be blocked", weight: 0.35,
    why: "Banks don't block accounts by SMS or ask you to 'update KYC' through a link or a call.",
    re: /(account|card|kyc|pan|aadhaar|wallet)( number)? (has been |will be |is |shall be )?(blocked|suspended|frozen|deactivated|closed|expired|on hold)|(update|complete|verify) (your )?kyc|kyc (update|pending|verification)|re-?kyc/i,
  },
  {
    id: "safe_account", category: "money_request", label: "Asks you to move money to a \"safe\" account", weight: 0.55,
    why: "No police, court, RBI or bank ever asks you to move your savings to a 'safe', 'secret' or 'verification' account. That money is gone.",
    re: /(safe|secure|secret|rbi|government|verification|escrow|supervision) (bank )?account|(money|funds?|amount|savings) will be (returned|refunded|released|sent back) after (the )?(verification|investigation|checking)|transfer (all )?(of )?your (savings|money|funds|fixed deposits?) (to|into)|सुरक्षित खाते|आरबीआई (के )?खाते/i,
  },
  {
    id: "remote_access", category: "credentials", label: "Asks you to install an app or share your screen", weight: 0.45,
    why: "Screen-sharing apps like AnyDesk let a stranger see your codes and move your money while you watch.",
    re: /\b(anydesk|any desk|teamviewer|team viewer|rustdesk|quick ?support|airdroid)\b|share (your )?screen|screen ?shar(e|ing)|(install|download) (this|the|an?) (app|application|apk)|\.apk\b/i,
  },
  {
    id: "payment_demand", category: "money_request", label: "Asks you to send money", weight: 0.15,
    why: "Any request to send money deserves a pause, especially from someone you can't see.",
    re: /\b(pay|send|transfer|deposit)\b.{0,40}(rs\.?\s?\d|₹\s?\d|inr\s?\d|\$\s?\d|\d[\d,]*\s?(rupees|lakh|lakhs|crore|thousand))|paise? bhej|paisa transfer|पैसे (भेज|ट्रांसफर)/i,
  },
];

/** Real OTP messages warn you not to share the code; scammers ask you to share it. */
const OTP_WARNING_RE = /(do not|don'?t|never|not to) (share|disclose|tell)\b.{0,40}\b(otp|code|pin|it|this|anyone)|\b(otp|code|password)\b.{0,80}(do not|don'?t|never) (share|disclose)/i;
const OTP_ASK_RE = /(?<!(do not|don'?t|never|not to) )(share|send|tell|give|read|forward|say)( it)?( to)?( me| us)? (the |your |that )?(otp|code|pin|password)|otp (batao|bhejo|bata do|share karo|paranju tharu)|ओटीपी बता/i;

/** A message that explicitly uses protected payment wording is slightly less risky. */
const SAFE_PAYMENT_RE = /goods (and|&) services|buyer protection|via (a )?paypal invoice|cash on delivery|pay (in person|at pick ?up)/i;

function excerptOf(text: string, m: RegExpMatchArray): string {
  const i = m.index ?? 0;
  const start = Math.max(0, i - 30);
  const end = Math.min(text.length, i + m[0].length + 30);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "…" : "");
}

export function compileExtraRules(specs: ExtraRuleSpec[] = []): Rule[] {
  const out: Rule[] = [];
  for (const s of specs) {
    try {
      out.push({ ...s, weight: clampWeight(s.weight), re: new RegExp(s.pattern, "i") });
    } catch {
      // A bad pattern from config must never break checks.
    }
  }
  return out;
}

const clampWeight = (w: number) => (Number.isFinite(w) ? Math.min(0.95, Math.max(0, w)) : 0);

/** Probabilistic OR: several weak signals add up, one strong one dominates. */
export function probOr(weights: number[]): number {
  return 1 - weights.reduce((acc, w) => acc * (1 - w), 1);
}

export function adviceFor(level: Level, hits: { id: SignalId; ruleId?: string }[]): string {
  const has = (id: string) => hits.some((h) => h.id === id || h.ruleId === id);
  if (level === "high") {
    if (has("video_custody") || (has("authority") && has("secrecy")))
      return "Hang up now. Real police never arrest anyone on a video call. Call a family member, and report it at cybercrime.gov.in or 1930.";
    if (has("credentials")) return "Don't share any code, PIN or password. Stop replying and call your bank on the number on your card.";
    return "Don't send money, share codes or click links. Check with the person or company on a number you already know, and tell someone you trust.";
  }
  if (level === "medium")
    return "Be careful. Don't pay or share any codes until you've checked directly, using a number you find yourself.";
  return "No strong scam signals found. If anything still feels off, ask someone you trust before you pay.";
}

export function explanationFor(level: Level, hits: RuleHit[]): string {
  if (hits.length === 0) return "We didn't find the usual warning signs of a scam in this message.";
  const labels = [...new Set(hits.map((h) => h.label.toLowerCase()))].slice(0, 3);
  const list = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : labels[0];
  const lead = level === "high" ? "This looks like a scam." : level === "medium" ? "This has some warning signs." : "This has a small warning sign.";
  return `${lead} We found: ${list}.`;
}

export function scoreRules(text: string, opts: RulesOptions = {}): RulesResult {
  const rules = [...RULES, ...compileExtraRules(opts.extraRules)];
  const signals: RuleHit[] = [];
  for (const r of rules) {
    let weight = opts.weights?.[r.id] !== undefined ? clampWeight(opts.weights[r.id]!) : r.weight;
    if (r.id === "credentials" && OTP_WARNING_RE.test(text) && !OTP_ASK_RE.test(text)) weight = Math.min(weight, 0.1);
    if (weight <= 0) continue;
    const m = text.match(r.re);
    if (m) signals.push({ ruleId: r.id, id: r.category, label: r.label, why: r.why, weight, excerpt: excerptOf(text, m) });
  }
  signals.sort((a, b) => b.weight - a.weight);
  let p = probOr(signals.map((s) => s.weight));
  if (SAFE_PAYMENT_RE.test(text) && !signals.some((s) => s.ruleId === "ff_request")) p = Math.max(0, p - 0.1);
  const score = Math.round(Math.min(1, p) * 100);
  const level = levelFor(score, opts.thresholds ?? DEFAULT_THRESHOLDS);
  return { score, level, signals, explanation: explanationFor(level, signals), advice: adviceFor(level, signals) };
}
