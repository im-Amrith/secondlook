# Good morning: overnight build notes

Repo: https://github.com/im-Amrith/secondlook (public, `main`, ~40 small commits, CI green). **Nothing was deployed**, no Firebase or Google Cloud project was created, and no credentials or keys were entered anywhere. The Firebase config is placeholders only (`web/.env.example`).

## Read this first: one real finding

While testing against the real Firebase AI Logic SDK (13.3.0) I found that an **`ONLY_ON_DEVICE` model silently sends its request to the cloud** when Chrome's `LanguageModel` isn't present at the moment the model is created (and always in the SDK's Node build): `chromeAdapterFactory` returns nothing and `callCloudOrDevice` falls through to the cloud call. Our pipeline only used the device runner after Nano reported "available", but I added a hard guard anyway (lazy model creation, a check before every call, rejecting any non-`on_device` answer) plus contract tests. It's worth mentioning in the submission, and you may want to report it to Firebase (I didn't post anything).

Related: one of those tests briefly made a **real request** to `firebasevertexai.googleapis.com` with a fake API key, the fake project id `demo-secondlook` and the text "first call creates the model" (no user data). Google rejected it (`API_KEY_INVALID`). Web tests now block all network access.

## Added later: read aloud (open-source TTS from Hugging Face)

A **🔊 Read aloud** button on every result and follow-up answer, plus a *Read aloud* section in Settings (pick/download/try/remove a voice per language, slower speech, read results automatically). Everything runs in the browser in a Web Worker: nothing is sent anywhere to be spoken.

- **Voices:** Piper (fast, default): English LJ Speech, Hindi Priyamvada, Malayalam Meera, plus Kristin/Rohan/Arjun. **Kokoro-82M** (Apache-2.0, most natural): English Heart/Michael and Hindi Alpha/Omega. One espeak-ng WASM phonemizer feeds both, which is how Kokoro speaks Hindi in the browser.
- **Measured** (`evals/TTS.md`): Whisper large-v3-turbo transcribed each voice back. Error rate: Kokoro English 0%, Piper English 2.7%, Kokoro Hindi 5.7%, Piper Hindi 10.8%, Piper Malayalam 38.6% (mostly Whisper's own Malayalam weakness). In Chrome on one WASM thread Piper ran ~4x faster than real time, while Kokoro was 2.6x *slower*, so Piper is the default.
- **Verified in the browser:** downloaded and played English Kokoro, Hindi Kokoro, Hindi Piper and Malayalam Piper (audio buffers checked, I can't listen); the download offer on a Hindi result spoke 33 s after the click, download included.
- **Listen yourself:** `npm run tts:samples` writes `tts-samples/*.wav` (I also sent them to you). Tell me which voices you prefer and I'll change `DEFAULT_VOICE` in `web/src/lib/tts/voices.ts`.
- **Licences to know:** the Hindi and Malayalam **Piper** voices are trained on **non-commercial** datasets (fine for the contest; Settings labels them). Kokoro is Apache-2.0; the English Piper voices use public-domain data.
- **Not verified:** the extension side panel's read-aloud (built with `wasm-unsafe-eval` in its CSP, not loaded in Chrome); Kokoro with WebGPU (not used, the CPU numbers above are why Piper is default).

## What got built

**`shared/`** (core, all unit-tested): rules engine (16 shield-paypal-ai rules made generic + secrecy, digital-arrest/video custody, account/KYC block, payment demand; Hinglish/Manglish/Devanagari terms), verdict schema + tolerant parser, redactor (phones, emails, UPI, cards, IBAN, accounts, OTPs, Aadhaar, PAN, names), prompts, privacy router (routing table as a pure function with reasons), combiner, the full check pipeline (fallbacks both ways, screenshot consent, chunking, Nano name masking, follow-ups, answers in Hindi/Malayalam from the cloud), local URL/page scorer.

**`evals/`**: 84 labelled messages (52 from shield-paypal-ai + 32 new), a redaction eval (26 identifiers), a banner eval (36 login URLs), runner with recorded device/cloud scorers. Rules only: **96% precision / 94% recall**. Redaction: **26/26 removed, 41/41 useful phrases kept**. Banner: **18/18 look-alikes caught, 0/18 false alarms**. Each eval found a real bug that was fixed and is noted in `evals/RESULTS.md`.

**`web/`** (Vite + React; large type, light/dark, phone-friendly, installable PWA that loads offline)
- Welcome screen with language buttons (**English / हिंदी / മലയാളം**), **Download the private model (one time)** (`initializeDeviceModel()` on the click), `LanguageModel.availability()` status (text and image checked separately), **Test the AI connection** (a `PREFER_ON_DEVICE` call that prints `inferenceSource`).
- Check screen: paste or screenshot, **live route preview** ("will be checked on this device" / "will remove personal details, then cloud"), result card, **🟢/🔵/⚪ privacy badge**, **See exactly what was sent**, **follow-up questions**, **Let my family know**.
- **Privacy** page: the real router run against this device for typical cases.
- Settings (Never use the cloud, family alerts, extra-large text, language), Family circle (Google sign-in, invite link), guardian **Alerts** (real-time Firestore listener).
- Firebase AI Logic (`ONLY_ON_DEVICE` + `ONLY_IN_CLOUD` from one `getAI()`), App Check, Remote Config, lazy-loaded Firebase (first load 90 KB gzipped).
- Rules-only mode with an "AI not configured" notice when `VITE_FIREBASE_*` is missing.
- `#/evals` developer page to run the datasets through the real models in Chrome.

**`extension/`** (MV3, plain Vite multi-entry, no CRXJS): side panel reusing the web UI (Check, Family, Alerts, Model, Settings), right-click **Check with SecondLook** (selection or page), **Check the page I'm on** button, shadow-DOM warning banner on look-alike login/payment pages, `chrome.identity` sign-in with `firebase/auth/web-extension`.

**Firebase files**: `firebase.json` (Hosting + Firestore + Remote Config), `firestore.rules` (metadata-only alerts), `firestore.indexes.json`, `remoteconfig.template.json`.

**Docs**: `README.md` (problem, routing table, Mermaid architecture, evals, setup, the SDK finding, reuse statement), `DEMO.md` (3-minute video shot by shot, test messages, a fictional demo login page for the banner).

**CI**: GitHub Actions runs tests, build, evals and the Firestore rules tests in the emulator on every push. All green.

## How it was verified

- `npm test`: **108 tests pass** (shared 71, evals 5, web 27, extension 5), including SDK contract tests against the real `firebase/ai` browser build with a fake Prompt API and stubbed `fetch`, and axe-core accessibility tests.
- `npm run build`: typecheck of all packages + web build + extension build.
- `npm run test:rules`: **8 Firestore security-rules tests pass in the emulator** (locally and in CI).
- In the built-in browser: onboarding, simulated-model check (🟢), rules-only check (⚪) with reasons, follow-up answers, Privacy page, Malayalam UI end to end, light/dark, no overflow at 375 px, and the PWA loading with the server stopped. The simulated model is dev-only (`?mockNano`) and labelled.

## Not done / not verified

- **No real Gemini Nano or Gemini cloud call has run** (needs your project and your Chrome). The SDK wiring is covered by the contract tests, which is as close as I could get without credentials.
- The extension is built and unit-tested but **not loaded into Chrome**.
- Extension App Check uses the **debug provider only** (reCAPTCHA can't run in MV3); a production extension would need a custom provider.
- Hindi/Malayalam translations are **my first drafts**: please have them checked (you can judge the Malayalam). Family/Alerts/Privacy/Evals pages are still English.
- No README screenshots yet: better to take them with real Nano tomorrow.
- `npm audit`: 4 "high" advisories, all in `@grpc/grpc-js` from Firebase's Node build of Firestore. Not in the browser bundles; fix needs a Firebase update.
- Android companion: not started (by plan).

## What you need to do

1. **Create the Firebase project** and **register a web app**.
2. **AI Logic** → Get started → **Gemini Developer API**.
3. Copy `web/.env.example` → `web/.env.local`; fill the six `VITE_FIREBASE_*` values (the extension reads the same file).
4. **App Check**: create a **reCAPTCHA Enterprise** key (add `localhost` and later your Hosting domain), put it in `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`. Run `npm run dev`, copy the **debug token** from the browser console, add it in App Check → Apps → Manage debug tokens. Enforce App Check for AI Logic once checks work.
5. **Authentication** → enable **Google**. **Firestore** → create the database. Log in and deploy rules, indexes and the Remote Config template with Node 22 (the Firebase CLI crashes on Node 26):
   `npx -y -p node@22 -p firebase-tools firebase login`
   `npx -y -p node@22 -p firebase-tools firebase deploy --only firestore,remoteconfig --project <your-project-id>`
   (`npm run deploy` also builds and deploys Hosting.)
6. `npm install`, `npm run dev`, open http://localhost:5173.
7. **Nano in your Chrome**: enable `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, relaunch, **Set up** → **Download the private model**, then **Test the AI connection** (expect 🟢), then the "CBI officer" example (expect 🟢, no "what was sent" link). Paste the Hindi message from DEMO.md (expect 🔵, redactions, the drawer, and a Hindi explanation).
8. **Evals with AI**: http://localhost:5173/#/evals → **Run on-device** → download → **Run cloud (redacted)** → download, then
   `npm run evals -- --recorded device=predictions-device.json --recorded cloud=predictions-cloud.json --write`
   and copy the new rows into the README's eval table.
9. **Extension**: `npm run build`, `chrome://extensions` → Developer mode → **Load unpacked** → `extension/dist`. Register its App Check debug token (side-panel console). For sign-in inside the extension: create an OAuth client of type *Chrome extension* for its id, set `VITE_GOOGLE_OAUTH_CLIENT_ID` (and `VITE_EXTENSION_KEY` to pin the id), rebuild, and add `chrome-extension://<id>` to Auth's authorised domains.
10. Set `VITE_PUBLIC_APP_URL` to the Hosting URL so invite links made in the extension open the web app.
11. Take README screenshots with real Nano (on-device result, Hindi cloud result with the drawer open, the banner, the guardian alert).
12. Windows only, if the Firestore emulator fails with "Unable to establish loopback connection": `set JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\tmp` (a folder with no spaces), then `npm run test:rules`.
