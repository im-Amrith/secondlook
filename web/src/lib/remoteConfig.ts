// Fetches Remote Config (loaded lazily with the rest of Firebase).
import { fetchAndActivate, getAll, type RemoteConfig } from "firebase/remote-config";
import { DEFAULT_CONFIG, parseConfig, RC_DEFAULTS, type AppConfig } from "./config";

export { DEFAULT_CONFIG, parseConfig, RC_DEFAULTS, type AppConfig };

export async function loadRemoteConfig(rc: RemoteConfig | null): Promise<AppConfig> {
  if (!rc) return DEFAULT_CONFIG;
  rc.defaultConfig = RC_DEFAULTS;
  rc.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 0 : 60 * 60 * 1000;
  try {
    await fetchAndActivate(rc);
  } catch (e) {
    console.warn("[SecondLook] Remote Config fetch failed; using defaults", e);
  }
  const all = getAll(rc);
  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) values[k] = v.asString();
  return parseConfig(values);
}
