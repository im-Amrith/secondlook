// Firebase wiring. Everything is lazy and guarded so the app works with no config at all.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";
import { getAI, GoogleAIBackend, type AI } from "firebase/ai";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getRemoteConfig, type RemoteConfig } from "firebase/remote-config";
import { firebaseConfig, isFirebaseConfigured, recaptchaSiteKey, useAppCheckDebug } from "./env";

export interface Services {
  app: FirebaseApp;
  appCheck: AppCheck | null;
  ai: AI;
  auth: Auth;
  db: Firestore;
  rc: RemoteConfig;
}

let services: Services | null | undefined;

export function getServices(): Services | null {
  if (services !== undefined) return services;
  if (!isFirebaseConfigured) return (services = null);

  const app = initializeApp(firebaseConfig);

  // App Check must be set up before any other Firebase call that it protects (AI Logic, Firestore).
  let appCheck: AppCheck | null = null;
  if (useAppCheckDebug) {
    // Prints a debug token in the console; register it in Firebase console → App Check.
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  if (recaptchaSiteKey) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else if (useAppCheckDebug) {
    // No reCAPTCHA (e.g. inside the Chrome extension, where reCAPTCHA can't load): in debug mode the
    // SDK exchanges the debug token and never calls this provider.
    appCheck = initializeAppCheck(app, {
      provider: new CustomProvider({ getToken: () => Promise.reject(new Error("App Check: debug token only")) }),
      isTokenAutoRefreshEnabled: true,
    });
  } else {
    console.warn("[SecondLook] VITE_RECAPTCHA_ENTERPRISE_SITE_KEY not set: App Check is off. AI Logic calls will fail if App Check is enforced.");
  }

  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const rc = getRemoteConfig(app);
  services = { app, appCheck, ai, auth: getAuth(app), db: getFirestore(app), rc };
  return services;
}
