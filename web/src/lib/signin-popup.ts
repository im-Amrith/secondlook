// Google sign-in for the web app (popup). The Chrome extension swaps this module for
// extension/src/signin-chrome.ts at build time (see extension/vite.config.ts), because MV3
// extensions can't open auth popups or load remote code.
import { GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";

export async function signInGoogle(auth: Auth): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider());
}
