# Good morning: overnight build notes

Repo: https://github.com/im-Amrith/secondlook (public, `main`, small commits). **Nothing was deployed**, no Firebase or Google Cloud project was created, and no credentials or keys were entered anywhere. The Firebase config is placeholders only (`web/.env.example`).

## What got built

**`shared/`** (core, all unit-tested)
- `rules.ts`: the 16 shield-paypal-ai rules with generic (non-PayPal) wording and advice, plus new rules for secrecy/isolation ("don't tell anyone", "stay on the call"), "digital arrest"/video-call custody, account/KYC block and payment demands; some Hinglish, Manglish and Devanagari terms; genuine "do not share your OTP" warnings no longer count as OTP requests; Remote Config weight overrides and live extra rules.
- `schema.ts` (verdict type + JSON schema, `source: ON_DEVICE | IN_CLOUD | RULES`, `redactions[]`), `redact.ts` (phones, emails, UPI, Luhn-checked cards, IBAN, accounts, OTPs, Aadhaar, PAN, names; `[PHONE_1]` placeholders; mapping stays local), `prompt.ts` (short prompts, ≤256 output tokens), `router.ts` (routing table as a pure function with a plain-language reason; one test per row), `combine.ts`, `pipeline.ts` (rules → router → device | redact→cloud | rules, fallbacks both ways, consent before a screenshot goes to the cloud, chunking, Nano-assisted name masking, follow-up questions), `url.ts` (local look-alike URL + login/payment page scorer).

**`evals/`**: shield-paypal-ai's two sets + 32 new labelled cases; a redaction eval (22 messages, 26 identifiers); runner with recorded-prediction scorers for device/cloud; `RESULTS.md`. Rules only: 84 cases, 96% precision, 94% recall. Redaction: 26/26 identifiers removed, 41/41 useful phrases kept (after fixing 2 gaps the eval found).

**`web/`** (Vite + React, large calm type, light/dark, phone-friendly)
- Onboarding with **Download the private model (one time)** (`initializeDeviceModel()` on the click) and `LanguageModel.availability()` status, plus **Test the AI connection** (a `PREFER_ON_DEVICE` call that prints `response.inferenceSource`).
- Check screen (paste or screenshot; non-JPEG/PNG images are re-encoded to PNG on the device), **live route preview** under the box, result card (score, level, highlighted signals, explanation, advice), the **🟢/🔵/⚪ privacy badge**, **See exactly what was sent** drawer, **follow-up questions**, **Let my family know**.
- **Privacy** page: the real router run against this device's current state for typical cases.
- Settings: **Never use the cloud**, family alerts, extra-large text, and what Remote Config set.
- Family circle (Google sign-in, invite link) and the guardian **Alerts** page (real-time Firestore listener, optional desktop notification).
- Firebase AI Logic (two models from one `getAI()`: `ONLY_ON_DEVICE` + `ONLY_IN_CLOUD`), App Check (reCAPTCHA Enterprise + debug token in dev), Remote Config with in-code defaults. **Rules-only mode with an "AI not configured" notice when `VITE_FIREBASE_*` is missing.**
- Firebase is lazy-loaded: the first screen is 278 KB (90 KB gzipped) instead of 939 KB.
- Developer eval page at `#/evals` (runs the datasets through the real models and downloads predictions).

**`extension/`** (MV3, plain Vite multi-entry build, no CRXJS)
- Side panel reusing the web UI (Check, Family, Alerts, Model, Settings tabs); AI runs in the panel page, never in the service worker.
- Right-click **Check with SecondLook** on a selection, or **Check this page with SecondLook**.
- Shadow-DOM warning banner on look-alike login/payment pages (local rules only).
- Google sign-in via `chrome.identity` → `signInWithCredential`, with `firebase/auth/web-extension` (MV3-safe); added to the manifest only when `VITE_GOOGLE_OAUTH_CLIENT_ID` is set.

**Firebase project files**: `firebase.json` (Hosting, Firestore, Remote Config), `firestore.rules` (alerts allow-list: metadata only), `firestore.indexes.json`, `remoteconfig.template.json`.

**Docs**: `README.md` (problem, routing table, Mermaid architecture, eval results, setup, reuse statement), `DEMO.md` (the 3-minute video, shot by shot, with test messages and a fictional demo login page for the banner).

## How it was verified

- `npm test` at the root: **87 tests pass** (shared 65, evals 4, web 14, extension 4).
- `npm run build` at the root: typecheck (shared, evals, web, extension) + web build + extension build pass.
- `npm run test:rules`: **8 Firestore security-rules tests pass in the real Firestore emulator** (Firebase CLI run under Node 22 via npx, Java 25). Covers circle create/join/read and alerts rejecting any text-carrying field, bad values, impersonation and outsiders.
- In the built-in browser (dev server): onboarding → simulated model download → CBI example → 🟢 on-device result; rules-only path with the router's reason; follow-up answer; Privacy page; light and dark mode; no horizontal overflow at 375 px. The simulated model is dev-only (`?mockNano`) and labelled "simulated" in the UI.
- Cloud path, redaction-before-cloud, screenshot consent, device↔cloud fallbacks, Nano name masking and follow-up routing are covered by **mocked-model unit tests**, not by a real Gemini call.

## Not done / not verified

- **No real Gemini Nano or cloud call has run.** Needs your Firebase project and your Chrome. If a real call fails, the likeliest spots are in `web/src/lib/ai.ts` (system prompt via `initialPrompts`, `responseConstraint`, `responseJsonSchema`); the SDK names were taken from the installed `firebase@13.3.0` typings, not guessed.
- The extension is built and unit-tested (including the side panel with a queued right-click check) but **was not loaded into Chrome**.
- Extension App Check uses the **debug provider only** (reCAPTCHA can't run in MV3). Fine for the demo; a production extension would need a custom App Check provider.
- Hindi/Malayalam **UI** (PLAN's optional item) not done; only the router and rules handle those languages.
- Android companion: not started (by plan).
- `npm audit` reports 4 high-severity advisories in dev dependencies; not investigated.

## What you need to do

1. **Create the Firebase project** and **register a web app**.
2. **AI Logic** → Get started → **Gemini Developer API**.
3. Copy `web/.env.example` → `web/.env.local`; fill the six `VITE_FIREBASE_*` values. (The extension reads the same file.)
4. **App Check**: create a **reCAPTCHA Enterprise** key (add `localhost` and later your Hosting domain), put it in `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`. Run `npm run dev`, copy the **debug token** from the browser console, add it under App Check → Apps → Manage debug tokens. Turn on enforcement for AI Logic once checks work.
5. **Authentication** → enable **Google**. **Firestore** → create the database (any region). Then deploy rules, indexes and the Remote Config template: `npm run deploy` deploys Hosting too; for rules only use `npx -y -p node@22 -p firebase-tools firebase deploy --only firestore,remoteconfig` (log in first with `npx -y -p node@22 -p firebase-tools firebase login`). The Firebase CLI crashes on Node 26, hence `node@22`.
6. `npm install`, `npm run dev`, open http://localhost:5173.
7. **Try the Nano path in your Chrome**: enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, relaunch, **Model/Set up** → **Download the private model**, then **Test the AI connection** (expect 🟢 on this device), then check the "CBI officer" example (expect 🟢 and no "what was sent" link). Then paste the Hindi message from DEMO.md (expect 🔵 with redactions and the drawer).
8. **Run the evals with AI**: http://localhost:5173/#/evals → **Run on-device** → download; **Run cloud (redacted)** → download; then
   `npm run evals -- --recorded device=predictions-device.json --recorded cloud=predictions-cloud.json --write`
   and copy the new rows into the README's eval table.
9. **Load the extension**: `npm run build`, `chrome://extensions` → Developer mode → **Load unpacked** → `extension/dist`. Register its App Check debug token (side panel console). For family sign-in in the extension: create an OAuth client of type *Chrome extension* for the extension id, set `VITE_GOOGLE_OAUTH_CLIENT_ID` (and `VITE_EXTENSION_KEY` to keep the id stable), rebuild, and add `chrome-extension://<id>` to Auth's authorised domains.
10. Set `VITE_PUBLIC_APP_URL` to your Hosting URL so invite links made in the extension open the web app.
11. Windows only, if the Firestore emulator fails with "Unable to establish loopback connection": `set JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\tmp` (any folder without spaces), then `npm run test:rules`.
