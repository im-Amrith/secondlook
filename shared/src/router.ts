// The privacy router: a pure function that decides where a check runs, and says why.
// It runs BEFORE any model call, so the app can redact before anything leaves the device.
// Routing table (also in the README):
//
// | Condition                                              | Route          |
// |--------------------------------------------------------|----------------|
// | Nano available, supported language, fits on device     | device         |
// | Language the on-device model isn't validated for       | redact → cloud |
// | Too long for on-device: chunk; if still too big        | redact → cloud |
// | Follow-up question (multi-turn)                        | redact → cloud |
// | No Nano                                                | redact → cloud |
// | Offline and no Nano                                    | rules          |
// | "Never use the cloud" (or cloud switched off)          | device / rules |

export type Route = "device" | "cloud" | "rules";
export type Platform = "web" | "android";
export type InputType = "text" | "image" | "page";
export type Lang = "en" | "hi" | "ml" | "latin-mixed" | "other";

export interface RouteInput {
  platform: Platform;
  nanoAvailable: boolean;
  lang: Lang;
  estTokens: number;
  inputType: InputType;
  multiTurn: boolean;
  userNeverCloud: boolean;
  online: boolean;
  /** Remote Config switch; false disables the cloud route for everyone. Default true. */
  cloudEnabled?: boolean;
}

export interface RouteDecision {
  route: Route;
  /** One plain sentence, shown to the user under the badge. */
  reason: string;
  /** Short machine-readable code for logs, evals and tests. */
  code:
    | "device_default"
    | "device_chunked"
    | "device_forced_lang"
    | "device_forced_long"
    | "device_forced_followup"
    | "cloud_no_nano"
    | "cloud_lang"
    | "cloud_too_long"
    | "cloud_followup"
    | "rules_offline"
    | "rules_never_cloud"
    | "rules_cloud_off";
  /** When route is device and the input is long: how many pieces to check separately. */
  chunks: number;
}

/** Documented on-device limits. Web: Chrome Prompt API session quota; Android: ML Kit GenAI. */
export const DEVICE_LIMITS: Record<Platform, { maxTokens: number; langs: Lang[] }> = {
  web: { maxTokens: 9216, langs: ["en", "latin-mixed"] },
  android: { maxTokens: 4000, langs: ["en", "latin-mixed"] },
};

/** Tokens reserved for the system prompt, rules hint and the JSON answer. */
export const PROMPT_OVERHEAD_TOKENS = 700;
/** At most this many on-device calls for one long input before we prefer the cloud. */
export const MAX_DEVICE_CHUNKS = 3;

export function deviceBudget(platform: Platform): number {
  return DEVICE_LIMITS[platform].maxTokens - PROMPT_OVERHEAD_TOKENS;
}

export function decideRoute(i: RouteInput): RouteDecision {
  const cloudAllowed = i.cloudEnabled !== false && !i.userNeverCloud;
  const canCloud = cloudAllowed && i.online;
  const budget = deviceBudget(i.platform);
  const chunksNeeded = Math.max(1, Math.ceil(i.estTokens / budget));
  const langOk = DEVICE_LIMITS[i.platform].langs.includes(i.lang);

  if (!i.nanoAvailable) {
    if (canCloud)
      return { route: "cloud", code: "cloud_no_nano", chunks: 1, reason: "This device doesn't have the private AI model, so personal details were removed and the check ran in the cloud." };
    if (i.userNeverCloud)
      return { route: "rules", code: "rules_never_cloud", chunks: 1, reason: "You chose never to use the cloud and this device has no private AI model, so we ran a quick check." };
    if (i.cloudEnabled === false)
      return { route: "rules", code: "rules_cloud_off", chunks: 1, reason: "The cloud check is switched off right now and this device has no private AI model, so we ran a quick check." };
    return { route: "rules", code: "rules_offline", chunks: 1, reason: "You're offline and this device has no private AI model, so we ran a quick check." };
  }

  if (i.multiTurn) {
    if (canCloud)
      return { route: "cloud", code: "cloud_followup", chunks: 1, reason: "Follow-up questions need the cloud model (the private model answers one question at a time). Personal details were removed first." };
    return { route: "device", code: "device_forced_followup", chunks: 1, reason: "Answered on this device as a fresh question, because the cloud isn't being used." };
  }

  if (!langOk && i.inputType !== "image") {
    const langName = i.lang === "hi" ? "Hindi" : i.lang === "ml" ? "Malayalam" : "this language";
    if (canCloud)
      return { route: "cloud", code: "cloud_lang", chunks: 1, reason: `The private model isn't tested for ${langName} yet, so personal details were removed and the check ran in the cloud.` };
    return { route: "device", code: "device_forced_lang", chunks: Math.min(chunksNeeded, MAX_DEVICE_CHUNKS), reason: `Checked on this device. It isn't tested for ${langName}, so the result may be less accurate.` };
  }

  if (chunksNeeded > 1) {
    if (chunksNeeded <= MAX_DEVICE_CHUNKS)
      return { route: "device", code: "device_chunked", chunks: chunksNeeded, reason: `Long message: checked on this device in ${chunksNeeded} parts. Nothing was sent anywhere.` };
    if (canCloud)
      return { route: "cloud", code: "cloud_too_long", chunks: 1, reason: "This is too long for the private model, so personal details were removed and the check ran in the cloud." };
    return { route: "device", code: "device_forced_long", chunks: MAX_DEVICE_CHUNKS, reason: "Very long message: we checked the first parts on this device only, because the cloud isn't being used." };
  }

  return { route: "device", code: "device_default", chunks: 1, reason: "Checked on this device. Nothing was sent anywhere." };
}

/** Cheap language guess from scripts and a few common romanised words. */
export function guessLang(text: string): Lang {
  let deva = 0, mal = 0, latin = 0, other = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x0900 && c <= 0x097f) deva++;
    else if (c >= 0x0d00 && c <= 0x0d7f) mal++;
    else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) latin++;
    else if (c > 0x2ff && !(c >= 0x2000 && c <= 0x2bff) && !(c >= 0x1f000)) other++;
  }
  const letters = deva + mal + latin + other;
  if (letters === 0) return "en";
  if (deva / letters > 0.3) return "hi";
  if (mal / letters > 0.3) return "ml";
  if (other / letters > 0.3) return "other";
  const romanised = text.match(/\b(hai|hain|nahi|nahin|kya|aap|aapka|apna|karo|kijiye|mat|bhejo|paisa|paise|turant|jaldi|abhi|kripya|ningal|ningalude|alle|aano|venam|cheyyuka|ayakkuka|parayaruth)\b/gi);
  return romanised && romanised.length >= 2 ? "latin-mixed" : "en";
}

/** Split text into roughly equal pieces on whitespace. */
export function chunkText(text: string, n: number): string[] {
  if (n <= 1) return [text];
  const size = Math.ceil(text.length / n);
  const out: string[] = [];
  let start = 0;
  while (start < text.length && out.length < n) {
    let end = out.length === n - 1 ? text.length : Math.min(text.length, start + size);
    if (end < text.length) {
      const ws = text.lastIndexOf(" ", end);
      if (ws > start + size / 2) end = ws;
    }
    out.push(text.slice(start, end).trim());
    start = end;
  }
  return out.filter(Boolean);
}
