// Firebase AI Logic hybrid inference. Two models from one getAI() instance:
//   device: InferenceMode.ONLY_ON_DEVICE  (Gemini Nano via Chrome's Prompt API)
//   cloud:  InferenceMode.ONLY_IN_CLOUD   (Gemini via the Gemini Developer API)
// shared/router.ts picks between them so text can be redacted BEFORE anything goes to the cloud.
// Names checked against firebase@13.3.0 typings: getAI, getGenerativeModel, GoogleAIBackend,
// InferenceMode.{ONLY_ON_DEVICE,ONLY_IN_CLOUD,PREFER_ON_DEVICE}, GenerativeModel.initializeDeviceModel,
// response.inferenceSource ("on_device" | "in_cloud"), HybridParams.{onDeviceParams,inCloudParams}.
import { getGenerativeModel, InferenceMode, InferenceSource, type AI, type GenerativeModel, type Part } from "firebase/ai";
import { AI_VERDICT_JSON_SCHEMA, FOLLOWUP_SYSTEM_PROMPT, MAX_OUTPUT_TOKENS, NAMES_JSON_SCHEMA, NAMES_SYSTEM_PROMPT, parseNames, SYSTEM_PROMPT, type ImageInput, type ModelReply, type ModelRunner } from "@secondlook/shared";
import { NANO_IMAGE_OPTIONS, NANO_TEXT_OPTIONS } from "./nano";
import { PRACTICE_SYSTEM_PROMPT } from "./practice";
import { DEFAULT_CLOUD_MODEL, type DeviceRunner } from "./models";

export { DEFAULT_CLOUD_MODEL, type DeviceRunner };

function toParts(prompt: string, image?: ImageInput): Array<string | Part> {
  return image ? [prompt, { type: "inlineData", inlineData: { data: image.data, mimeType: image.mimeType } }] : [prompt];
}

async function run(model: GenerativeModel, prompt: string, image: ImageInput | undefined, fallback: ModelReply["source"]): Promise<ModelReply> {
  const result = await model.generateContent(toParts(prompt, image));
  const src = result.response.inferenceSource;
  const source: ModelReply["source"] = src === InferenceSource.ON_DEVICE ? "ON_DEVICE" : src === InferenceSource.IN_CLOUD ? "IN_CLOUD" : fallback;
  return { text: result.response.text(), source };
}

/**
 * JSON-schema keywords beyond type/properties/required/enum/items may not be supported by every
 * on-device constraint decoder, so the device gets a plain version (lengths are still capped by
 * the prompt, the output token limit and parseAiVerdict()).
 */
export function plainSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(plainSchema);
  if (schema && typeof schema === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema)) {
      if (["maxLength", "minLength", "minimum", "maximum", "maxItems", "minItems"].includes(k)) continue;
      out[k] = plainSchema(v);
    }
    return out;
  }
  return schema;
}

const DEVICE_VERDICT_SCHEMA = plainSchema(AI_VERDICT_JSON_SCHEMA) as object;

/**
 * PRIVACY GUARD. In firebase@13.3.0, getGenerativeModel() only attaches the on-device adapter if
 * Chrome's `LanguageModel` (Prompt API) exists at that moment; without it, generateContent() goes
 * straight to the cloud even in ONLY_ON_DEVICE mode (see callCloudOrDevice / chromeAdapterFactory
 * in @firebase/ai). So on-device models are created lazily, only once the Prompt API is present,
 * and every on-device call refuses to run without it. A cloud answer from an on-device model is
 * also rejected (see run()).
 */
export function promptApiPresent(): boolean {
  const g = globalThis as unknown as { LanguageModel?: { availability?: unknown }; window?: { LanguageModel?: { availability?: unknown } } };
  return typeof g.LanguageModel?.availability === "function" || typeof g.window?.LanguageModel?.availability === "function";
}

export class OnDeviceUnavailableError extends Error {
  constructor() {
    super("The on-device model (Chrome Prompt API) isn't available; refusing to run an on-device request.");
  }
}

/** Creates the model on first use, and only when the Prompt API exists. */
function lazyDevice(make: () => GenerativeModel): () => GenerativeModel {
  let model: GenerativeModel | undefined;
  return () => {
    if (!promptApiPresent()) throw new OnDeviceUnavailableError();
    return (model ??= make());
  };
}

/** Runs an ONLY_ON_DEVICE model and refuses any answer that didn't come from the device. */
async function runOnDevice(model: GenerativeModel, prompt: string, image?: ImageInput): Promise<ModelReply> {
  const reply = await run(model, prompt, image, "ON_DEVICE");
  if (reply.source !== "ON_DEVICE") throw new OnDeviceUnavailableError();
  return reply;
}

function deviceModel(ai: AI, cloudModelName: string, withImages: boolean): GenerativeModel {
  return getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        ...(withImages ? NANO_IMAGE_OPTIONS : NANO_TEXT_OPTIONS),
        // The on-device adapter ignores systemInstruction, so the system prompt goes here.
        initialPrompts: [{ role: "system", content: [{ type: "text", value: SYSTEM_PROMPT }] }],
      },
      promptOptions: { responseConstraint: DEVICE_VERDICT_SCHEMA },
    },
    // Required by the SDK even in ONLY_ON_DEVICE mode; never called in this mode.
    inCloudParams: { model: cloudModelName },
  });
}

/** Two on-device models: text-only (works on every Nano-capable Chrome) and text+image. */
export function makeDeviceRunner(ai: AI, cloudModelName = DEFAULT_CLOUD_MODEL): DeviceRunner {
  const text = lazyDevice(() => deviceModel(ai, cloudModelName, false));
  const image = lazyDevice(() => deviceModel(ai, cloudModelName, true));
  return {
    initialize: async (onProgress) => {
      await text().initializeDeviceModel(onProgress);
      // Same model weights; this just prepares a multimodal session if this Chrome supports it.
      await image()
        .initializeDeviceModel()
        .catch(() => undefined);
    },
    run: async (prompt, img) => runOnDevice(img ? image() : text(), prompt, img),
  };
}

export function makeCloudRunner(ai: AI, modelName = DEFAULT_CLOUD_MODEL): ModelRunner {
  const model = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: AI_VERDICT_JSON_SCHEMA as unknown as Record<string, unknown>,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
      },
    },
  });
  return { run: (prompt, image) => run(model, prompt, image, "IN_CLOUD") };
}

/**
 * The simple PREFER_ON_DEVICE model from the plan: the SDK chooses, and we read
 * response.inferenceSource. Not used by the main check (which must redact before the cloud),
 * but used by the onboarding "test the model" button to show the SDK's own choice.
 */
export function makePreferOnDeviceModel(ai: AI, cloudModelName = DEFAULT_CLOUD_MODEL): GenerativeModel {
  return getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    onDeviceParams: { createOptions: NANO_TEXT_OPTIONS },
    inCloudParams: { model: cloudModelName },
  });
}

/** Plain-text runners for follow-up questions (no JSON schema). */
export function makeFollowUpRunners(ai: AI, cloudModelName = DEFAULT_CLOUD_MODEL): { device: ModelRunner; cloud: ModelRunner } {
  const device = lazyDevice(() => getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        ...NANO_TEXT_OPTIONS,
        initialPrompts: [{ role: "system", content: [{ type: "text", value: FOLLOWUP_SYSTEM_PROMPT }] }],
      },
    },
    inCloudParams: { model: cloudModelName },
  }));
  const cloud = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: { model: cloudModelName, systemInstruction: FOLLOWUP_SYSTEM_PROMPT, generationConfig: { maxOutputTokens: 200, temperature: 0.3 } },
  });
  return {
    device: { run: async (p) => runOnDevice(device(), p) },
    cloud: { run: (p) => run(cloud, p, undefined, "IN_CLOUD") },
  };
}

/**
 * On-device name finder: used only when a check is going to the cloud while Gemini Nano is
 * available, so people's names are masked too (regex catches only names after titles).
 */
export function makeDeviceNameFinder(ai: AI, cloudModelName = DEFAULT_CLOUD_MODEL): (text: string) => Promise<string[]> {
  // This model sees the UNREDACTED text, so it must never fall back to the cloud (see promptApiPresent).
  const model = lazyDevice(() => getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        initialPrompts: [{ role: "system", content: [{ type: "text", value: NAMES_SYSTEM_PROMPT }] }],
      },
      promptOptions: { responseConstraint: plainSchema(NAMES_JSON_SCHEMA) as object },
    },
    inCloudParams: { model: cloudModelName },
  }));
  return async (text) => {
    const reply = await runOnDevice(model(), text.slice(0, 6000));
    return parseNames(reply.text, text);
  };
}


/**
 * The scam-practice partner (lib/practice.ts): Gemini Nano plays a scam caller so the learner can
 * practise saying no. On-device only; the learner's replies never leave the device.
 */
export function makePracticeRunner(ai: AI, cloudModelName = DEFAULT_CLOUD_MODEL): ModelRunner {
  const model = lazyDevice(() => getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        ...NANO_TEXT_OPTIONS,
        initialPrompts: [{ role: "system", content: [{ type: "text", value: PRACTICE_SYSTEM_PROMPT }] }],
      },
    },
    inCloudParams: { model: cloudModelName },
  }));
  return { run: async (p) => runOnDevice(model(), p) };
}
