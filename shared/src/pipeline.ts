// The whole check, platform-independent: rules → router → (device | redact → cloud | rules) → combine.
// Model calls are injected, so the web app, the extension and the tests all share this code.
import { combine, mergeChunkVerdicts } from "./combine";
import { buildFollowUpPrompt, buildUserPrompt, estimateTokens, IMAGE_PROMPT } from "./prompt";
import { redact, type RedactionItem } from "./redact";
import { chunkText, decideRoute, guessLang, type Platform, type RouteDecision } from "./router";
import { scoreRules, type RulesOptions } from "./rules";
import { parseAiVerdict, type AiVerdict, type Redaction, type Verdict } from "./schema";

export interface ImageInput {
  /** Base64 without the data: prefix. */
  data: string;
  mimeType: "image/jpeg" | "image/png";
}

export interface CheckInput {
  text?: string;
  image?: ImageInput;
  /** e.g. "page" when the extension sends page text. */
  kind?: "text" | "image" | "page";
}

export interface ModelReply {
  text: string;
  /** What actually ran, from Firebase AI Logic's `response.inferenceSource`. */
  source: "ON_DEVICE" | "IN_CLOUD";
}

export interface ModelRunner {
  run(prompt: string, image?: ImageInput): Promise<ModelReply>;
}

export interface PipelineDeps {
  platform: Platform;
  /** Is the on-device model ready right now? */
  nanoAvailable: () => Promise<boolean> | boolean;
  online: () => boolean;
  device?: ModelRunner;
  cloud?: ModelRunner;
  settings: { neverCloud: boolean };
  config?: { cloudEnabled?: boolean; rules?: RulesOptions };
  /**
   * Screenshots can't be cleaned by regex. If one would go to the cloud, ask the user first.
   * Returning false keeps it on the device (rules on any typed text only).
   */
  confirmImageUpload?: () => Promise<boolean>;
  /**
   * Optional on-device name finder (Gemini Nano). When a check must go to the cloud but Nano is
   * available, names it finds are masked as well. Never called without Nano.
   */
  findNames?: (text: string) => Promise<string[]>;
  now?: () => number;
}

const NAME_TIMEOUT_MS = 5000;

/** Ask the on-device model for names, but never let it block or break a check. */
async function deviceNames(deps: Pick<PipelineDeps, "findNames">, nano: boolean, text: string): Promise<string[]> {
  if (!nano || !deps.findNames || !text) return [];
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<string[]>((r) => (timer = setTimeout(() => r([]), NAME_TIMEOUT_MS)));
    const names = await Promise.race([deps.findNames(text), timeout]);
    clearTimeout(timer);
    return names.filter((n) => text.includes(n));
  } catch {
    return [];
  }
}

export interface CheckOutcome {
  verdict: Verdict;
  decision: RouteDecision;
  /** Exactly what left the device (redacted), or null if nothing did. */
  sentText: string | null;
  sentImage: boolean;
  /** Local-only mapping of placeholders; for the "see what was sent" drawer. */
  redactionItems: RedactionItem[];
  latencyMs: number;
  /** Set when the planned route failed and we fell back. */
  fallbackNote?: string;
  /** True when we couldn't actually read the input (e.g. a screenshot with no AI available). */
  inconclusive?: boolean;
}

async function runChunks(runner: ModelRunner, text: string, chunks: number, rulesHint: Parameters<typeof buildUserPrompt>[1]): Promise<{ ai: AiVerdict | null; source: ModelReply["source"] }> {
  const parts = chunkText(text, chunks);
  const verdicts: AiVerdict[] = [];
  let source: ModelReply["source"] = "ON_DEVICE";
  for (const p of parts) {
    const reply = await runner.run(buildUserPrompt(p, rulesHint));
    source = reply.source;
    const v = parseAiVerdict(reply.text);
    if (v) verdicts.push(v);
  }
  return { ai: mergeChunkVerdicts(verdicts), source };
}

export async function checkMessage(input: CheckInput, deps: PipelineDeps): Promise<CheckOutcome> {
  const now = deps.now ?? (() => Date.now());
  const t0 = now();
  const text = (input.text ?? "").trim();
  const rulesOpts = deps.config?.rules;
  const rules = scoreRules(text, rulesOpts);
  const thresholds = rulesOpts?.thresholds;
  const nano = !!deps.device && (await deps.nanoAvailable());
  const inputType = input.image ? "image" : (input.kind ?? "text");

  const decision = decideRoute({
    platform: deps.platform,
    nanoAvailable: nano,
    lang: guessLang(text),
    estTokens: estimateTokens(text),
    inputType,
    multiTurn: false,
    userNeverCloud: deps.settings.neverCloud,
    online: deps.online(),
    // No cloud runner (AI not configured) behaves like the cloud being switched off.
    cloudEnabled: deps.config?.cloudEnabled !== false && !!deps.cloud,
  });

  const done = (o: Omit<CheckOutcome, "latencyMs" | "decision"> & { decision?: RouteDecision }): CheckOutcome => ({ ...o, decision: o.decision ?? decision, latencyMs: now() - t0 });
  const rulesOnly = (note?: string, d?: RouteDecision) => {
    const verdict = combine(rules, null, { source: "RULES", thresholds });
    const inconclusive = !text && !!input.image;
    if (inconclusive) {
      verdict.explanation = "We couldn't read this screenshot without the AI model.";
      verdict.advice = "Copy and paste the message text instead, or ask someone you trust to look at it.";
    }
    return done({ verdict, sentText: null, sentImage: false, redactionItems: [], fallbackNote: note, decision: d, inconclusive });
  };

  const runCloud = async (note?: string, d?: RouteDecision): Promise<CheckOutcome> => {
    if (!deps.cloud) return rulesOnly(note ?? "The cloud model isn't set up, so we ran a quick check.", d);
    let image: ImageInput | undefined;
    if (input.image) {
      const ok = deps.confirmImageUpload ? await deps.confirmImageUpload() : false;
      if (!ok) return rulesOnly("The screenshot stayed on your device, so we ran a quick check on any text instead.", d);
      image = input.image;
    }
    const red = redact(text, { names: await deviceNames(deps, nano, text) });
    const prompt = image ? `${IMAGE_PROMPT}\n${buildUserPrompt(red.text, rules)}` : buildUserPrompt(red.text, rules);
    const reply = await deps.cloud.run(prompt, image);
    const ai = parseAiVerdict(reply.text);
    return done({
      verdict: combine(rules, ai, { source: ai ? reply.source : "RULES", redactions: red.redactions, thresholds }),
      sentText: prompt,
      sentImage: !!image,
      redactionItems: red.items,
      fallbackNote: note,
      decision: d,
    });
  };

  if (decision.route === "rules") return rulesOnly();

  if (decision.route === "cloud") {
    try {
      return await runCloud();
    } catch {
      if (nano && deps.device) {
        // Cloud failed but the device can still try.
        try {
          const { ai, source } = await runChunks(deps.device, text, 1, rules);
          return done({ verdict: combine(rules, ai, { source: ai ? source : "RULES", thresholds }), sentText: null, sentImage: false, redactionItems: [], fallbackNote: "The cloud didn't answer, so we checked on this device instead." });
        } catch {
          /* fall through */
        }
      }
      return rulesOnly("The AI check didn't answer, so we ran a quick check.");
    }
  }

  // device
  try {
    let ai: AiVerdict | null;
    let source: ModelReply["source"];
    if (input.image) {
      const reply = await deps.device!.run(`${IMAGE_PROMPT}\n${buildUserPrompt(text, rules)}`, input.image);
      ai = parseAiVerdict(reply.text);
      source = reply.source;
    } else {
      ({ ai, source } = await runChunks(deps.device!, text, decision.chunks, rules));
    }
    if (source === "IN_CLOUD") {
      // Should never happen with ONLY_ON_DEVICE; if it does, be honest about it.
      return done({ verdict: combine(rules, ai, { source: "IN_CLOUD", thresholds }), sentText: buildUserPrompt(text, rules), sentImage: !!input.image, redactionItems: [] });
    }
    if (!ai) throw new Error("unparseable on-device reply");
    return done({ verdict: combine(rules, ai, { source: "ON_DEVICE", thresholds }), sentText: null, sentImage: false, redactionItems: [] });
  } catch {
    const canCloud = deps.config?.cloudEnabled !== false && !deps.settings.neverCloud && deps.online() && !!deps.cloud;
    if (canCloud) {
      const d: RouteDecision = { route: "cloud", code: "cloud_no_nano", chunks: 1, reason: "The private model couldn't answer this time, so personal details were removed and the check ran in the cloud." };
      try {
        return await runCloud("The on-device model didn't answer, so we used the cloud with personal details removed.", d);
      } catch {
        /* fall through */
      }
    }
    return rulesOnly("The on-device model didn't answer, so we ran a quick check.", { route: "rules", code: "rules_offline", chunks: 1, reason: "The AI check didn't answer, so we ran a quick check." });
  }
}

export interface FollowUpDeps extends Omit<PipelineDeps, "device" | "cloud" | "confirmImageUpload"> {
  /** Plain-text (not JSON) runners for follow-up answers. */
  device?: ModelRunner;
  cloud?: ModelRunner;
}

export interface FollowUpOutcome {
  answer: string;
  source: "ON_DEVICE" | "IN_CLOUD" | "RULES";
  decision: RouteDecision;
  sentText: string | null;
  redactions: Redaction[];
  redactionItems: RedactionItem[];
}

const CANNED_FOLLOWUP =
  "Don't reply, pay, or share any code. If you already paid or shared a code, call your bank now using the number on your card, and report it (in India: call 1930 or visit cybercrime.gov.in). Then tell someone you trust.";

/** A follow-up question is multi-turn, which the on-device model can't do, so the router prefers the (redacted) cloud. */
export async function askFollowUp(question: string, original: string, verdict: Verdict, deps: FollowUpDeps): Promise<FollowUpOutcome> {
  const nano = !!deps.device && (await deps.nanoAvailable());
  const decision = decideRoute({
    platform: deps.platform,
    nanoAvailable: nano,
    lang: guessLang(`${original} ${question}`),
    estTokens: estimateTokens(original) + estimateTokens(question),
    inputType: "text",
    multiTurn: true,
    userNeverCloud: deps.settings.neverCloud,
    online: deps.online(),
    cloudEnabled: deps.config?.cloudEnabled !== false && !!deps.cloud,
  });
  const summary = `${verdict.level} risk (${verdict.score}/100). ${verdict.explanation}`;
  const canned = (d: RouteDecision): FollowUpOutcome => ({ answer: CANNED_FOLLOWUP, source: "RULES", decision: d, sentText: null, redactions: [], redactionItems: [] });

  try {
    if (decision.route === "cloud" && deps.cloud) {
      // Redact the original and the question together so placeholders stay consistent.
      const both = `${original}\n\u0000\n${question}`;
      const joined = redact(both, { names: await deviceNames(deps, nano, both) });
      const [rOriginal = "", rQuestion = ""] = joined.text.split("\n\u0000\n");
      const prompt = buildFollowUpPrompt(rOriginal, summary, rQuestion);
      const reply = await deps.cloud.run(prompt);
      return { answer: reply.text.trim(), source: reply.source, decision, sentText: prompt, redactions: joined.redactions, redactionItems: joined.items };
    }
    if (decision.route === "device" && deps.device) {
      const reply = await deps.device.run(buildFollowUpPrompt(original, summary, question));
      return { answer: reply.text.trim(), source: "ON_DEVICE", decision, sentText: null, redactions: [], redactionItems: [] };
    }
  } catch {
    return canned({ route: "rules", code: "rules_offline", chunks: 1, reason: "The AI didn't answer, so here is our standard advice." });
  }
  return canned(decision.route === "rules" ? decision : { ...decision, route: "rules", reason: "AI isn't available right now, so here is our standard advice." });
}
