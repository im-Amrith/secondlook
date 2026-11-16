import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { askFollowUp, checkMessage, type CheckInput, type CheckOutcome, type FollowUpOutcome, type ModelRunner, type Verdict } from "@secondlook/shared";
import type { Services } from "./firebase";
import type { Runtime } from "./runtime";
import { makeSimulatedDeviceRunner, makeSimulatedFollowUpRunner, type DeviceRunner } from "./models";
import { nanoStatus, type NanoStatus } from "./nano";
import { DEFAULT_CONFIG, type AppConfig } from "./config";
import { useSettings, type Settings } from "./settings";
import { isFirebaseConfigured, mockNanoEnabled } from "./env";

export type Surface = "web" | "extension";

export interface AppState {
  surface: Surface;
  /** Firebase services once the lazily loaded runtime has arrived (null before, or with no config). */
  services: Services | null;
  runtime: Runtime | null;
  /** Firebase config is present (AI can be used once the runtime loads). */
  aiConfigured: boolean;
  device: DeviceRunner | null;
  cloud: ModelRunner | null;
  nano: NanoStatus;
  simulatedNano: boolean;
  refreshNano: () => Promise<NanoStatus>;
  setNano: (s: NanoStatus) => void;
  config: AppConfig;
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  user: User | null;
  check: (input: CheckInput, confirmImageUpload: () => Promise<boolean>) => Promise<CheckOutcome>;
  followUp: (question: string, original: string, verdict: Verdict) => Promise<FollowUpOutcome>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

/** Loads the Firebase runtime chunk once, only when there is a config. */
let runtimePromise: Promise<Runtime | null> | null = null;
function getRuntime(): Promise<Runtime | null> {
  if (!isFirebaseConfigured) return Promise.resolve(null);
  runtimePromise ??= import("./runtime").then((m) => m.loadRuntime());
  return runtimePromise;
}

export function AppProvider({ children, override, surface = "web" }: { children: ReactNode; override?: Partial<AppState>; surface?: Surface }) {
  const simulatedNano = useMemo(() => mockNanoEnabled(), []);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [settings, updateSettings] = useSettings();
  const [nano, setNano] = useState<NanoStatus>(simulatedNano ? "downloadable" : "unsupported");
  const [user, setUser] = useState<User | null>(null);

  const simulated = useMemo(() => (simulatedNano ? { device: makeSimulatedDeviceRunner(), followUp: makeSimulatedFollowUpRunner() } : null), [simulatedNano]);
  const runners = runtime?.runners(config.cloudModel) ?? null;
  const device: DeviceRunner | null = simulated?.device ?? runners?.device ?? null;
  const cloud: ModelRunner | null = runners?.cloud ?? null;

  const refreshNano = useCallback(async () => {
    if (simulatedNano) return nano;
    const s = await nanoStatus();
    setNano(s);
    return s;
  }, [simulatedNano, nano]);

  useEffect(() => {
    void refreshNano();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;
    void getRuntime().then((rt) => {
      if (!alive || !rt) return;
      setRuntime(rt);
      void rt.loadConfig().then((c) => alive && setConfig(c));
      unsub = rt.watchUser(setUser);
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, []);

  /** Resolve runners at call time, waiting for the runtime if a check starts before it arrives. */
  const resolveRunners = useCallback(async () => {
    const rt = runtime ?? (await getRuntime());
    return rt?.runners(config.cloudModel) ?? null;
  }, [runtime, config.cloudModel]);

  const check = useCallback(
    async (input: CheckInput, confirmImageUpload: () => Promise<boolean>) => {
      const r = await resolveRunners();
      return checkMessage(input, {
        platform: "web",
        nanoAvailable: () => nano === "available",
        online: () => navigator.onLine,
        device: simulated?.device ?? r?.device,
        cloud: config.cloudEnabled ? r?.cloud : undefined,
        settings: { neverCloud: settings.neverCloud },
        config: { cloudEnabled: config.cloudEnabled, rules: config.rules },
        confirmImageUpload,
        findNames: simulated ? undefined : r?.findNames,
        now: () => performance.now(),
      });
    },
    [resolveRunners, nano, simulated, config, settings.neverCloud],
  );

  const followUp = useCallback(
    async (question: string, original: string, verdict: Verdict) => {
      const r = await resolveRunners();
      return askFollowUp(question, original, verdict, {
        platform: "web",
        nanoAvailable: () => nano === "available",
        online: () => navigator.onLine,
        device: simulated?.followUp ?? r?.followUp.device,
        cloud: config.cloudEnabled ? r?.followUp.cloud : undefined,
        settings: { neverCloud: settings.neverCloud },
        config: { cloudEnabled: config.cloudEnabled },
        findNames: simulated ? undefined : r?.findNames,
      });
    },
    [resolveRunners, nano, simulated, config.cloudEnabled, settings.neverCloud],
  );

  const value: AppState = {
    surface,
    services: runtime?.services ?? null,
    runtime,
    aiConfigured: isFirebaseConfigured,
    device,
    cloud,
    nano,
    simulatedNano,
    refreshNano,
    setNano,
    config,
    settings,
    updateSettings,
    user,
    check,
    followUp,
    ...override,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
