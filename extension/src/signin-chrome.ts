// Google sign-in inside the extension: chrome.identity gets an OAuth token for the Chrome
// profile's Google account, and Firebase Auth signs in with it as a credential.
// Needs the "identity" permission and an "oauth2" client in the manifest (VITE_GOOGLE_OAUTH_CLIENT_ID).
import { GoogleAuthProvider, signInWithCredential, type Auth } from "firebase/auth";

function getToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!chrome.identity?.getAuthToken) {
      reject(new Error("Sign-in isn't set up in this build (missing identity permission or OAuth client)."));
      return;
    }
    chrome.identity.getAuthToken({ interactive: true }, (result?: string | { token?: string }) => {
      const err = chrome.runtime.lastError;
      const token = typeof result === "string" ? result : result?.token;
      if (err || !token) reject(new Error(err?.message ?? "No token"));
      else resolve(token);
    });
  });
}

export async function signInGoogle(auth: Auth): Promise<void> {
  const token = await getToken();
  await signInWithCredential(auth, GoogleAuthProvider.credential(null, token));
}
