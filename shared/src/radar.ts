// Scam radar: "this kind of scam was reported 37 times in Kerala this week".
// Only three things are ever shared, and only when the person taps "Add to the scam radar":
// the TYPE of scam (one of the ids below, worked out on the device from the rules that fired),
// the ISO week, and a coarse region the person chose (a state, or just "India").
// No message, no excerpt, no score, no user id, no time more precise than the week.
// firestore.rules enforces the same: counters only, +1 at a time.

export const RADAR_PATTERNS = [
  "digital_arrest",
  "bank_kyc",
  "electricity",
  "job_task",
  "prize_lottery",
  "investment",
  "family_emergency",
  "romance",
  "other",
] as const;
export type RadarPattern = (typeof RADAR_PATTERNS)[number];

export const RADAR_PATTERN_LABELS: Record<RadarPattern, string> = {
  digital_arrest: "\"Digital arrest\" / fake police calls",
  bank_kyc: "Bank or KYC block, OTP requests",
  electricity: "Electricity or phone cut-off threats",
  job_task: "Easy-money job and task offers",
  prize_lottery: "Prizes and lotteries",
  investment: "Investment, crypto and gift cards",
  family_emergency: "\"New number\" family emergencies",
  romance: "Romance and online friends asking for money",
  other: "Other scams",
};

/**
 * Which kind of scam this is, from the rule ids that fired (and/or signal category ids from an AI
 * verdict, e.g. "job", "link"). Pure and local.
 */
export function classifyPattern(ids: readonly string[]): RadarPattern {
  const ruleIds = ids.map((id) => CATEGORY_TO_RULE[id] ?? id);
  const has = (...want: string[]) => want.some((id) => ruleIds.includes(id));
  if (has("video_custody") || (has("authority") && has("secrecy", "safe_account"))) return "digital_arrest";
  if (has("utility_threat")) return "electricity";
  if (has("account_block") || (has("credentials") && has("suspicious_link"))) return "bank_kyc";
  if (has("job_scam")) return "job_task";
  if (has("prize")) return "prize_lottery";
  if (has("gift_card_crypto", "too_good")) return "investment";
  if (has("romance")) return "romance";
  if (has("unverifiable") && has("payment_demand", "advance_fee", "ff_request")) return "family_emergency";
  if (has("credentials", "account_block")) return "bank_kyc";
  if (has("authority", "safe_account")) return "digital_arrest";
  return "other";
}

/** Signal categories (from AI verdicts) mapped onto the closest rule id. */
const CATEGORY_TO_RULE: Record<string, string> = { job: "job_scam", link: "suspicious_link", money_request: "payment_demand" };

/** Indian states and union territories, plus "IN" for "just India". */
export const RADAR_REGIONS: { id: string; name: string }[] = [
  { id: "IN", name: "India (don't share my state)" },
  { id: "AN", name: "Andaman and Nicobar Islands" },
  { id: "AP", name: "Andhra Pradesh" },
  { id: "AR", name: "Arunachal Pradesh" },
  { id: "AS", name: "Assam" },
  { id: "BR", name: "Bihar" },
  { id: "CH", name: "Chandigarh" },
  { id: "CT", name: "Chhattisgarh" },
  { id: "DH", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { id: "DL", name: "Delhi" },
  { id: "GA", name: "Goa" },
  { id: "GJ", name: "Gujarat" },
  { id: "HP", name: "Himachal Pradesh" },
  { id: "HR", name: "Haryana" },
  { id: "JH", name: "Jharkhand" },
  { id: "JK", name: "Jammu and Kashmir" },
  { id: "KA", name: "Karnataka" },
  { id: "KL", name: "Kerala" },
  { id: "LA", name: "Ladakh" },
  { id: "LD", name: "Lakshadweep" },
  { id: "MH", name: "Maharashtra" },
  { id: "ML", name: "Meghalaya" },
  { id: "MN", name: "Manipur" },
  { id: "MP", name: "Madhya Pradesh" },
  { id: "MZ", name: "Mizoram" },
  { id: "NL", name: "Nagaland" },
  { id: "OR", name: "Odisha" },
  { id: "PB", name: "Punjab" },
  { id: "PY", name: "Puducherry" },
  { id: "RJ", name: "Rajasthan" },
  { id: "SK", name: "Sikkim" },
  { id: "TG", name: "Telangana" },
  { id: "TN", name: "Tamil Nadu" },
  { id: "TR", name: "Tripura" },
  { id: "UP", name: "Uttar Pradesh" },
  { id: "UT", name: "Uttarakhand" },
  { id: "WB", name: "West Bengal" },
];

export const isRadarRegion = (id: string) => RADAR_REGIONS.some((r) => r.id === id);

/** ISO-8601 week, e.g. "2026-W48" (weeks start on Monday; week 1 contains the first Thursday). */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** This week and last week, for "this week vs last week". */
export function radarWeeks(now: Date): [string, string] {
  return [isoWeek(now), isoWeek(new Date(now.getTime() - 7 * 86400000))];
}

export const radarDocId = (week: string, pattern: RadarPattern, region: string) => `${week}_${pattern}_${region}`;

export interface RadarCount {
  week: string;
  pattern: RadarPattern;
  region: string;
  count: number;
}

export interface RadarRow {
  pattern: RadarPattern;
  thisWeek: number;
  lastWeek: number;
  /** This week's count in the chosen region (when a region filter is set). */
  inRegion: number;
}

/** Totals per pattern for this week and last week, most reported first. */
export function summariseRadar(counts: RadarCount[], weeks: [string, string], region?: string): RadarRow[] {
  const rows = new Map<RadarPattern, RadarRow>();
  for (const c of counts) {
    const row = rows.get(c.pattern) ?? { pattern: c.pattern, thisWeek: 0, lastWeek: 0, inRegion: 0 };
    if (c.week === weeks[0]) {
      row.thisWeek += c.count;
      if (region && c.region === region) row.inRegion += c.count;
    } else if (c.week === weeks[1]) row.lastWeek += c.count;
    rows.set(c.pattern, row);
  }
  return [...rows.values()].filter((r) => r.thisWeek + r.lastWeek > 0).sort((a, b) => b.thisWeek - a.thisWeek || b.lastWeek - a.lastWeek);
}
