// Reads the Firebase web config from VITE_FIREBASE_* env vars. When they are missing the app
// still runs: rules-only checks, with an "AI not configured" notice.
const e = import.meta.env;

export const firebaseConfig = {
  apiKey: e.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: e.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: e.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: e.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

/** The hosted web app (Firebase Hosting URL), used for family invite links made in the extension. */
export const publicAppUrl = ((e.VITE_PUBLIC_APP_URL as string | undefined) || "").replace(/\/$/, "") || undefined;

export const recaptchaSiteKey = (e.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY as string | undefined) || undefined;

/** Debug App Check provider: always in `vite dev`, or when explicitly enabled. */
export const useAppCheckDebug = e.DEV || e.VITE_APPCHECK_DEBUG === "true";

/** Dev-only simulated on-device model, for testing the UI where Gemini Nano isn't available. */
export function mockNanoEnabled(): boolean {
  if (!e.DEV) return false;
  try {
    return new URLSearchParams(location.search).has("mockNano") || localStorage.getItem("sl.mockNano") === "1";
  } catch {
    return false;
  }
}
