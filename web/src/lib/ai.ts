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
  const text = deviceModel(ai, cloudModelName, false);
  const image = deviceModel(ai, cloudModelName, true);
  return {
    initialize: async (onProgress) => {
      await text.initializeDeviceModel(onProgress);
      // Same model weights; this just prepares a multimodal session if this Chrome supports it.
      await image.initializeDeviceModel().catch(() => undefined);
    },
    run: (prompt, img) => run(img ? image : text, prompt, img, "ON_DEVICE"),
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
  const device = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        ...NANO_TEXT_OPTIONS,
        initialPrompts: [{ role: "system", content: [{ type: "text", value: FOLLOWUP_SYSTEM_PROMPT }] }],
      },
    },
    inCloudParams: { model: cloudModelName },
  });
  const cloud = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: { model: cloudModelName, systemInstruction: FOLLOWUP_SYSTEM_PROMPT, generationConfig: { maxOutputTokens: 200, temperature: 0.3 } },
  });
  return {
    device: { run: (p) => run(device, p, undefined, "ON_DEVICE") },
    cloud: { run: (p) => run(cloud, p, undefined, "IN_CLOUD") },
  };
}

/**
 * On-device name finder: used only when a check is going to the cloud while Gemini Nano is
 * available, so people's names are masked too (regex catches only names after titles).
 */
export function makeDeviceNameFinder(ai: AI, cloudModelName = DEFAULT_CLOUD_MODEL): (text: string) => Promise<string[]> {
  const model = getGenerativeModel(ai, {
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
  });
  return async (text) => {
    const r = await model.generateContent(text.slice(0, 6000));
    if (r.response.inferenceSource === InferenceSource.IN_CLOUD) return []; // must never happen; ignore if it does
    return parseNames(r.response.text(), text);
  };
}

