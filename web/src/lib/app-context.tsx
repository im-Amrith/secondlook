import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { askFollowUp, checkMessage, type CheckInput, type CheckOutcome, type FollowUpOutcome, type ModelRunner, type Verdict } from "@secondlook/shared";
import { getServices, type Services } from "./firebase";
import { makeCloudRunner, makeDeviceNameFinder, makeDeviceRunner, makeFollowUpRunners, makeSimulatedDeviceRunner, makeSimulatedFollowUpRunner, type DeviceRunner } from "./ai";
import { nanoStatus, type NanoStatus } from "./nano";
import { DEFAULT_CONFIG, loadRemoteConfig, type AppConfig } from "./remoteConfig";
import { useSettings, type Settings } from "./settings";
import { mockNanoEnabled } from "./env";
import { watchUser } from "./family";

export type Surface = "web" | "extension";

export interface AppState {
  surface: Surface;
  services: Services | null;
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

export function AppProvider({ children, override, surface = "web" }: { children: ReactNode; override?: Partial<AppState>; surface?: Surface }) {
  const services = useMemo(() => getServices(), []);
  const simulatedNano = useMemo(() => mockNanoEnabled(), []);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [settings, updateSettings] = useSettings();
  const [nano, setNano] = useState<NanoStatus>(simulatedNano ? "downloadable" : "unsupported");
  const [user, setUser] = useState<User | null>(null);

  const device = useMemo<DeviceRunner | null>(() => {
    if (simulatedNano) return makeSimulatedDeviceRunner();
    return services ? makeDeviceRunner(services.ai, config.cloudModel) : null;
  }, [services, simulatedNano, config.cloudModel]);
  const cloud = useMemo<ModelRunner | null>(() => (services ? makeCloudRunner(services.ai, config.cloudModel) : null), [services, config.cloudModel]);

  const findNames = useMemo(() => (services && !simulatedNano ? makeDeviceNameFinder(services.ai, config.cloudModel) : undefined), [services, simulatedNano, config.cloudModel]);

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
    if (!services) return;
    void loadRemoteConfig(services.rc).then(setConfig);
    return watchUser(services.auth, setUser);
  }, [services]);

  const check = useCallback(
    (input: CheckInput, confirmImageUpload: () => Promise<boolean>) =>
      checkMessage(input, {
        platform: "web",
        nanoAvailable: () => nano === "available",
        online: () => navigator.onLine,
        device: device ?? undefined,
        cloud: config.cloudEnabled ? (cloud ?? undefined) : undefined,
        settings: { neverCloud: settings.neverCloud },
        config: { cloudEnabled: config.cloudEnabled, rules: config.rules },
        confirmImageUpload,
        findNames,
        now: () => performance.now(),
      }),
    [nano, device, cloud, config, settings.neverCloud, findNames],
  );

  const followUpRunners = useMemo(() => {
    const real = services ? makeFollowUpRunners(services.ai, config.cloudModel) : null;
    return simulatedNano ? { device: makeSimulatedFollowUpRunner(), cloud: real?.cloud } : real;
  }, [services, simulatedNano, config.cloudModel]);

  const followUp = useCallback(
    (question: string, original: string, verdict: Verdict) =>
      askFollowUp(question, original, verdict, {
        platform: "web",
        nanoAvailable: () => nano === "available",
        online: () => navigator.onLine,
        device: followUpRunners?.device,
        cloud: config.cloudEnabled ? followUpRunners?.cloud : undefined,
        settings: { neverCloud: settings.neverCloud },
        config: { cloudEnabled: config.cloudEnabled },
        findNames,
      }),
    [nano, followUpRunners, config.cloudEnabled, settings.neverCloud, findNames],
  );

  const value: AppState = {
    surface,
    services,
    aiConfigured: !!services,
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
