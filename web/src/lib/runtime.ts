// Everything that needs the Firebase SDK, behind ONE dynamic import (see app-context.tsx).
// The first screen and rules-only checks load without it; this chunk arrives in the background.
import type { User } from "firebase/auth";
import type { ModelRunner } from "@secondlook/shared";
import { getServices, type Services } from "./firebase";
import { makeCloudRunner, makeDeviceNameFinder, makeDeviceRunner, makeFollowUpRunners, makePreferOnDeviceModel } from "./ai";
import type { DeviceRunner } from "./models";
import { loadRemoteConfig } from "./remoteConfig";
import type { AppConfig } from "./config";
import { watchUser } from "./family";

export interface Runners {
  device: DeviceRunner;
  cloud: ModelRunner;
  findNames: (text: string) => Promise<string[]>;
  followUp: { device: ModelRunner; cloud: ModelRunner };
}

export interface Runtime {
  services: Services;
  /** Model runners for a given cloud model name (cached per name). */
  runners: (cloudModel: string) => Runners;
  loadConfig: () => Promise<AppConfig>;
  watchUser: (cb: (u: User | null) => void) => () => void;
  /** PREFER_ON_DEVICE model for the setup screen's connection test. */
  preferOnDevice: (cloudModel: string) => ReturnType<typeof makePreferOnDeviceModel>;
}

export function loadRuntime(): Runtime | null {
  const services = getServices();
  if (!services) return null;
  const cache = new Map<string, Runners>();
  return {
    services,
    runners: (cloudModel) => {
      let r = cache.get(cloudModel);
      if (!r) {
        r = {
          device: makeDeviceRunner(services.ai, cloudModel),
          cloud: makeCloudRunner(services.ai, cloudModel),
          findNames: makeDeviceNameFinder(services.ai, cloudModel),
          followUp: makeFollowUpRunners(services.ai, cloudModel),
        };
        cache.set(cloudModel, r);
      }
      return r;
    },
    loadConfig: () => loadRemoteConfig(services.rc),
    watchUser: (cb) => watchUser(services.auth, cb),
    preferOnDevice: (cloudModel) => makePreferOnDeviceModel(services.ai, cloudModel),
  };
}
