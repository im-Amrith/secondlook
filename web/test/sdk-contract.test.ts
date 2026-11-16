// Contract tests against the REAL Firebase AI Logic SDK (firebase/ai), with the transport stubbed:
// a fake fetch for the cloud model and a fake Chrome Prompt API (LanguageModel) for the device
// model. They check that our runners build the requests we think they do and read
// response.inferenceSource correctly. No credentials or network needed.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import { getAI, GoogleAIBackend, type AI } from "firebase/ai";
import { SYSTEM_PROMPT } from "@secondlook/shared";
import { makeCloudRunner, makeDeviceNameFinder, makeDeviceRunner, makeFollowUpRunners, OnDeviceUnavailableError } from "../src/lib/ai";

/** The SDK reads LanguageModel from `window` (jsdom's window here), so install the fake there too. */
function installPromptApi(fake: unknown) {
  vi.stubGlobal("LanguageModel", fake);
  (window as unknown as { LanguageModel?: unknown }).LanguageModel = fake;
}

const VERDICT = { score: 91, level: "high", signals: [{ id: "authority", excerpt: "CBI" }], explanation: "Fake police.", advice: "Hang up." };

let app: FirebaseApp;
let ai: AI;

beforeAll(() => {
  app = initializeApp({ apiKey: "test-key", projectId: "demo-secondlook", appId: "1:1:web:1" }, `contract-${Date.now()}`);
  ai = getAI(app, { backend: new GoogleAIBackend() });
  return () => deleteApp(app);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as { LanguageModel?: unknown }).LanguageModel;
});

describe("cloud runner (InferenceMode.ONLY_IN_CLOUD)", () => {
  it("sends the system prompt, JSON schema and only the given (redacted) prompt, and reads in_cloud", async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
        return new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(VERDICT) }] }, finishReason: "STOP" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    const cloud = makeCloudRunner(ai, "gemini-3.5-flash-lite");
    const reply = await cloud.run('Message:\n"""Call [PHONE_1] now"""');

    expect(reply.source).toBe("IN_CLOUD");
    expect(JSON.parse(reply.text)).toMatchObject({ score: 91, level: "high" });
    expect(calls).toHaveLength(1);
    const { url, body } = calls[0]!;
    expect(url).toContain("gemini-3.5-flash-lite");
    expect(url).toContain("generateContent");
    expect(JSON.stringify(body.systemInstruction)).toContain("You help older people spot scams");
    expect(body.generationConfig).toMatchObject({ responseMimeType: "application/json", maxOutputTokens: 256 });
    expect((body.generationConfig as { responseJsonSchema?: object }).responseJsonSchema).toBeTruthy();
    expect(JSON.stringify(body.contents)).toContain("[PHONE_1]");
  });
});

describe("device runner (InferenceMode.ONLY_ON_DEVICE via Chrome's Prompt API)", () => {
  it("puts the system prompt in initialPrompts, passes the JSON constraint, never calls fetch, and reads on_device", async () => {
    const created: { options: Record<string, unknown> }[] = [];
    const prompted: { input: unknown; options: Record<string, unknown> }[] = [];
    const fakeLM = {
      availability: vi.fn(async () => "available"),
      create: vi.fn(async (options: Record<string, unknown>) => {
        created.push({ options });
        return {
          prompt: vi.fn(async (input: unknown, opts: Record<string, unknown>) => {
            prompted.push({ input, options: opts });
            return JSON.stringify(VERDICT);
          }),
          promptStreaming: vi.fn(),
          destroy: vi.fn(),
        };
      }),
    };
    installPromptApi(fakeLM);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const device = makeDeviceRunner(ai);
    const reply = await device.run('Message:\n"""This is CBI"""');

    expect(reply.source).toBe("ON_DEVICE");
    expect(JSON.parse(reply.text).score).toBe(91);
    expect(fetchSpy).not.toHaveBeenCalled();
    const createOpts = created.at(-1)!.options as { initialPrompts?: { role: string; content: { value: string }[] }[]; expectedInputs?: { type: string }[] };
    expect(createOpts.initialPrompts?.[0]?.role).toBe("system");
    expect(createOpts.initialPrompts?.[0]?.content[0]?.value).toBe(SYSTEM_PROMPT);
    // Text checks don't require image support.
    expect(createOpts.expectedInputs?.map((i) => i.type)).toEqual(["text"]);
    const constraint = prompted.at(-1)!.options.responseConstraint as Record<string, unknown>;
    expect(JSON.stringify(constraint)).toContain('"required":["score","level","signals","explanation","advice"]');
    expect(JSON.stringify(constraint)).not.toContain("maxLength");
  });

  it("uses the multimodal session only for screenshots", async () => {
    const created: Record<string, unknown>[] = [];
    installPromptApi({
      availability: vi.fn(async () => "available"),
      create: vi.fn(async (o: Record<string, unknown>) => {
        created.push(o);
        return { prompt: vi.fn(async () => JSON.stringify(VERDICT)), destroy: vi.fn() };
      }),
    });
    // The SDK decodes inline images with fetch("data:…"); only data: URLs are allowed here.
    const net = vi.fn(async (url: string) => {
      if (String(url).startsWith("data:")) return new Response(new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }));
      throw new Error(`network: ${url}`);
    });
    vi.stubGlobal("fetch", net);
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({})));
    const device = makeDeviceRunner(ai);
    // 1x1 PNG
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const reply = await device.run("Read this screenshot", { data: png, mimeType: "image/png" });
    expect(reply.source).toBe("ON_DEVICE");
    const types = (created.at(-1) as { expectedInputs?: { type: string }[] }).expectedInputs?.map((i) => i.type);
    expect(types).toEqual(["text", "image"]);
    expect(net.mock.calls.every(([u]) => String(u).startsWith("data:"))).toBe(true);
  });
});

describe("privacy guard: no Prompt API means no request at all", () => {
  // In firebase@13.3.0 an ONLY_ON_DEVICE model created without window.LanguageModel sends the
  // request to the cloud instead. Our device runners must refuse before that can happen.
  it("device runner, follow-up runner and name finder refuse and never call fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const device = makeDeviceRunner(ai);
    await expect(device.run("Message: secret 9876543210")).rejects.toBeInstanceOf(OnDeviceUnavailableError);
    await expect(makeFollowUpRunners(ai).device.run("What now?")).rejects.toBeInstanceOf(OnDeviceUnavailableError);
    await expect(makeDeviceNameFinder(ai)("Ramesh Kumar 9876543210")).rejects.toBeInstanceOf(OnDeviceUnavailableError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("the guard still holds if the Prompt API disappears after models were created", async () => {
    installPromptApi({ availability: vi.fn(async () => "available"), create: vi.fn(async () => ({ prompt: vi.fn(async () => JSON.stringify(VERDICT)), destroy: vi.fn() })) });
    const device = makeDeviceRunner(ai);
    await device.run("first call creates the model");
    delete (window as unknown as { LanguageModel?: unknown }).LanguageModel;
    vi.unstubAllGlobals();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(device.run("secret")).rejects.toBeInstanceOf(OnDeviceUnavailableError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
