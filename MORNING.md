# Good morning: overnight build notes

Repo: https://github.com/im-Amrith/secondlook (public, `main`). Nothing was deployed, no Firebase or Google Cloud project was created, and no credentials were entered anywhere.

## What got built

- **Monorepo** (npm workspaces, strict TypeScript, Vitest): `shared/`, `web/`, `extension/`, `evals/`.
- **`shared/`** (fully unit-tested):
  - `rules.ts`: the 16 shield-paypal-ai rules with generic (non-PayPal) wording and advice, plus new rules: secrecy/isolation, "digital arrest"/video-call custody, account/KYC block, payment demand; a few Hinglish, Manglish and Devanagari terms; Remote Config weight overrides and runtime "extra rules".
  - `schema.ts`: the verdict type and JSON schema (`source: ON_DEVICE | IN_CLOUD | RULES`, `redactions[]`), plus a tolerant parser for model output.
  - `redact.ts`: phones (Indian + international), emails, UPI IDs, Luhn-checked cards, IBAN, account numbers, OTP-like codes, Aadhaar, PAN, names after titles. Stable `[PHONE_1]` placeholders; the mapping stays local.
  - `prompt.ts`: short system prompt, ≤256 output tokens, token estimator.
  - `router.ts`: the routing table as a pure function with a human-readable reason; one test per row.
  - `combine.ts`, `pipeline.ts`: the full check (rules → router → device | redact→cloud | rules) with fallbacks both ways, and consent before a screenshot goes to the cloud.
  - `url.ts`: local look-alike URL + login/payment-page scorer for the extension banner.
- **`evals/`**: shield-paypal-ai's `scam.json` + `scam_holdout.json`, 32 new labelled cases, a runner with pluggable/recorded scorers, `RESULTS.md` (rules only: 84 cases, 96% precision, 94% recall).
- **`web/`** (Vite + React): onboarding with **Download the private model (one time)** (`initializeDeviceModel` on click, `LanguageModel.availability()` status), check screen (paste or screenshot), result card, 🟢/🔵/⚪ privacy badge, **See exactly what was sent** drawer, **Never use the cloud** setting, Google sign-in + Firestore family circle, guardian live alerts page, Remote Config, App Check, developer eval page at `#/evals`, and a **Test the AI connection** button that prints `inferenceSource`.
- **`extension/`**: MV3, plain Vite multi-entry build (no CRXJS). Side panel reusing the web UI, right-click "Check with SecondLook" on a selection or a whole page, shadow-DOM warning banner on look-alike login/payment pages.
- `firebase.json` (Hosting + Firestore), `firestore.rules` (alerts allow-list: metadata only), `firestore.indexes.json`.

## How it was verified

- `npm test` at the root: shared, evals, web and extension suites all pass.
- `npm run build` at the root: typecheck + web build + extension build pass.
- In the built-in browser: onboarding → simulated model download → check of the "CBI officer" example → 🟢 on-device result with signals; and the rules-only path (⚪ quick check, with the router's reason). The simulated model is dev-only (`?mockNano`) and clearly labelled in the UI.
- The cloud path, redaction-before-cloud, consent for screenshots and device→cloud fallback are covered by mocked-model unit tests, **not** by a real Gemini call (no Firebase project yet).

## Not done / not verified

- **No real Gemini Nano or cloud call has run yet.** Needs your Firebase project and your Chrome.
- The extension was built and unit-tested but **not loaded into Chrome** (the automated browser can't load unpacked extensions).
- Firestore rules are written but **not tested against the emulator**: the Firebase CLI crashes on Node 26 (`buffer-equal-constant-time` SlowBuffer error). `npx firebase-tools` may need **Node 22 LTS** (e.g. `nvm use 22` or `npx -p node@22 ...`).
- Family-circle sign-in inside the extension isn't wired (MV3 can't use popups; needs `chrome.identity` → `signInWithCredential`). The web app has it.
- Android companion: not started (by plan).

## What you need to do

1. **Create the Firebase project** (console.firebase.google.com) and **register a web app**.
2. **AI Logic** → Get started → choose the **Gemini Developer API**.
3. Copy `web/.env.example` → `web/.env.local` and fill in the six `VITE_FIREBASE_*` values from the web app's config. (The extension reads the same file.)
4. **App Check**: create a **reCAPTCHA Enterprise** key (add `localhost` and your Hosting domain), put it in `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`. Run `npm run dev`, copy the **App Check debug token** printed in the browser console, and add it under App Check → Apps → Manage debug tokens. Enforce App Check for AI Logic once that works.
5. **Authentication** → enable **Google**. **Firestore** → create the database. Deploy rules and indexes with Node 22: `npx -p node@22 -p firebase-tools firebase deploy --only firestore` (not done overnight, as agreed).
6. `npm install`, then `npm run dev` and open http://localhost:5173.
7. **Try the Nano path in your Chrome**: enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` (and `#optimization-guide-on-device-model` if needed), relaunch, open **Set up** → **Download the private model**, then **Test the AI connection** (should say 🟢 on this device), then check the "CBI officer" example.
8. **Run the evals with AI**: open http://localhost:5173/#/evals, click **Run on-device**, download, then **Run cloud (redacted)**, download, and run:
   `npm run evals -- --recorded device=predictions-device.json --recorded cloud=predictions-cloud.json --write`
   Then copy the new rows into the README's eval table.
9. **Load the extension**: `npm run build`, `chrome://extensions` → Developer mode → Load unpacked → `extension/dist`. Select text → right-click → *Check with SecondLook*. Register the extension's App Check debug token too (it's printed in the side panel's console).
