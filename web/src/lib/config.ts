// App config (pure; no Firebase imports). Remote Config: risk thresholds, rule weights, the cloud switch, prompt version and a live
// "scam of the week" rule. In-code defaults mean the app behaves the same with no Firebase.
import { DEFAULT_THRESHOLDS, PROMPT_VERSION, SIGNAL_IDS, type ExtraRuleSpec, type RulesOptions, type SignalId } from "@secondlook/shared";
import { DEFAULT_CLOUD_MODEL } from "./models";

export const RC_DEFAULTS = {
  risk_threshold_medium: DEFAULT_THRESHOLDS.medium,
  risk_threshold_high: DEFAULT_THRESHOLDS.high,
  /** JSON object: { "<ruleId>": weight } */
  rule_weight_overrides: "{}",
  cloud_enabled: true,
  prompt_version: PROMPT_VERSION,
  cloud_model: DEFAULT_CLOUD_MODEL,
  /** JSON array of { id, category, label, why, weight, pattern } */
  extra_rules: "[]",
  /** Short text shown on the check screen, e.g. "Fake FASTag renewal messages are going around". */
  scam_of_the_week: "",
};

export interface AppConfig {
  cloudEnabled: boolean;
  cloudModel: string;
  promptVersion: string;
  scamOfTheWeek: string;
  rules: RulesOptions;
}

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function parseConfig(values: Record<string, string | number | boolean>): AppConfig {
  const num = (k: string, d: number) => {
    const n = Number(values[k]);
    return Number.isFinite(n) && n > 0 && n <= 100 ? n : d;
  };
  const medium = num("risk_threshold_medium", DEFAULT_THRESHOLDS.medium);
  const high = Math.max(medium + 1, num("risk_threshold_high", DEFAULT_THRESHOLDS.high));
  const weightsRaw = safeJson<Record<string, unknown>>(String(values.rule_weight_overrides ?? "{}"), {});
  const weights: Record<string, number> = {};
  for (const [k, v] of Object.entries(weightsRaw)) if (typeof v === "number") weights[k] = v;
  const extraRaw = safeJson<unknown[]>(String(values.extra_rules ?? "[]"), []);
  const extraRules: ExtraRuleSpec[] = (Array.isArray(extraRaw) ? extraRaw : [])
    .filter((r): r is ExtraRuleSpec => {
      const x = r as Partial<ExtraRuleSpec>;
      return typeof x?.id === "string" && typeof x.pattern === "string" && typeof x.weight === "number" && (SIGNAL_IDS as readonly string[]).includes(String(x.category));
    })
    .map((r) => ({ ...r, category: r.category as SignalId, label: r.label ?? r.id, why: r.why ?? "" }));
  const cloud = values.cloud_enabled;
  return {
    cloudEnabled: cloud === undefined ? true : cloud === true || cloud === "true",
    cloudModel: String(values.cloud_model || DEFAULT_CLOUD_MODEL),
    promptVersion: String(values.prompt_version || PROMPT_VERSION),
    scamOfTheWeek: String(values.scam_of_the_week ?? ""),
    rules: { thresholds: { medium, high }, weights, extraRules },
  };
}

export const DEFAULT_CONFIG: AppConfig = parseConfig(RC_DEFAULTS);
