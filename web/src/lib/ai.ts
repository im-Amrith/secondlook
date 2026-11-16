// Firebase AI Logic hybrid inference. Two models from one getAI() instance:
//   device: InferenceMode.ONLY_ON_DEVICE  (Gemini Nano via Chrome's Prompt API)
//   cloud:  InferenceMode.ONLY_IN_CLOUD   (Gemini via the Gemini Developer API)
// shared/router.ts picks between them so text can be redacted BEFORE anything goes to the cloud.
// Names checked against firebase@13.3.0 typings: getAI, getGenerativeModel, GoogleAIBackend,
// InferenceMode.{ONLY_ON_DEVICE,ONLY_IN_CLOUD,PREFER_ON_DEVICE}, GenerativeModel.initializeDeviceModel,
// response.inferenceSource ("on_device" | "in_cloud"), HybridParams.{onDeviceParams,inCloudParams}.
import { getGenerativeModel, InferenceMode, InferenceSource, type AI, type GenerativeModel, type Part } from "firebase/ai";
import { AI_VERDICT_JSON_SCHEMA, MAX_OUTPUT_TOKENS, SYSTEM_PROMPT, scoreRules, type ImageInput, type ModelReply, type ModelRunner } from "@secondlook/shared";
import { NANO_CREATE_OPTIONS } from "./nano";

export const DEFAULT_CLOUD_MODEL = "gemini-3.5-flash-lite";

export interface DeviceRunner extends ModelRunner {
  /** Must be called from a user gesture (button click). Downloads Gemini Nano if needed. */
  initialize(onProgress?: (p: number) => void): Promise<void>;
  simulated?: boolean;
}

function toParts(prompt: string, image?: ImageInput): Array<string | Part> {
  return image ? [prompt, { type: "inlineData", inlineData: { data: image.data, mimeType: image.mimeType } }] : [prompt];
}

async function run(model: GenerativeModel, prompt: string, image: ImageInput | undefined, fallback: ModelReply["source"]): Promise<ModelReply> {
  const result = await model.generateContent(toParts(prompt, image));
  const src = result.response.inferenceSource;
  const source: ModelReply["source"] = src === InferenceSource.ON_DEVICE ? "ON_DEVICE" : src === InferenceSource.IN_CLOUD ? "IN_CLOUD" : fallback;
  return { text: result.response.text(), source };
}

export function makeDeviceRunner(ai: AI, cloudModelName = DEFAULT_CLOUD_MODEL): DeviceRunner {
  const model = getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        ...NANO_CREATE_OPTIONS,
        // The on-device adapter ignores systemInstruction, so the system prompt goes here.
        initialPrompts: [{ role: "system", content: [{ type: "text", value: SYSTEM_PROMPT }] }],
      },
      promptOptions: { responseConstraint: AI_VERDICT_JSON_SCHEMA },
    },
    // Required by the SDK even in ONLY_ON_DEVICE mode; never called in this mode.
    inCloudParams: { model: cloudModelName },
  });
  return {
    initialize: (onProgress) => model.initializeDeviceModel(onProgress),
    run: (prompt, image) => run(model, prompt, image, "ON_DEVICE"),
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
    onDeviceParams: { createOptions: NANO_CREATE_OPTIONS },
    inCloudParams: { model: cloudModelName },
  });
}

/**
 * DEV ONLY: a stand-in for Gemini Nano so the on-device path can be exercised where Nano isn't
 * available (e.g. automated browsers). Enabled with ?mockNano in `npm run dev`. Clearly labelled.
 */
export function makeSimulatedDeviceRunner(): DeviceRunner {
  return {
    simulated: true,
    initialize: async (onProgress) => {
      for (let i = 1; i <= 5; i++) {
        await new Promise((r) => setTimeout(r, 120));
        onProgress?.(i / 5);
      }
    },
    run: async (prompt) => {
      await new Promise((r) => setTimeout(r, 400));
      const body = prompt.split('"""')[1] ?? prompt;
      const r = scoreRules(body);
      const json = {
        score: Math.min(100, r.score + (r.signals.length ? 5 : 0)),
        level: r.level,
        signals: r.signals.slice(0, 4).map((s) => ({ id: s.id, excerpt: s.excerpt.slice(0, 60) })),
        explanation: `(Simulated on-device model) ${r.explanation}`,
        advice: r.advice,
      };
      return { text: JSON.stringify(json), source: "ON_DEVICE" };
    },
  };
}
