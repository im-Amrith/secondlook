# Good morning: overnight build notes

Repo: https://github.com/im-Amrith/secondlook (public, `main`, ~40 small commits, CI green). **Nothing was deployed**, no Firebase or Google Cloud project was created, and no credentials or keys were entered anywhere. The Firebase config is placeholders only (`web/.env.example`).

## Read this first: one real finding

While testing against the real Firebase AI Logic SDK (13.3.0) I found that an **`ONLY_ON_DEVICE` model silently sends its request to the cloud** when Chrome's `LanguageModel` isn't present at the moment the model is created (and always in the SDK's Node build): `chromeAdapterFactory` returns nothing and `callCloudOrDevice` falls through to the cloud call. Our pipeline only used the device runner after Nano reported "available", but I added a hard guard anyway (lazy model creation, a check before every call, rejecting any non-`on_device` answer) plus contract tests. It's worth mentioning in the submission, and you may want to report it to Firebase (I didn't post anything).

Related: one of those tests briefly made a **real request** to `firebasevertexai.googleapis.com` with a fake API key, the fake project id `demo-secondlook` and the text "first call creates the model" (no user data). Google rejected it (`API_KEY_INVALID`). Web tests now block all network access.

## Added later: read aloud (open-source TTS from Hugging Face)

A **🔊 Read aloud** button on every result and follow-up answer, plus a *Read aloud* section in Settings (pick/download/try/remove a voice per language, slower speech, read results automatically). Everything runs in the browser in a Web Worker: nothing is sent anywhere to be spoken.

- **Voices:** Piper only, for speed: English LJ Speech (default) and Kristin, Hindi Priyamvada (default) and Rohan, Malayalam Meera (default) and Arjun. Kokoro-82M was removed after testing because it was too slow in the browser.
- **Measured** (`evals/TTS.md`): Whisper large-v3-turbo transcribed each voice back. Error rate: Kokoro English 0%, Piper English 2.7%, Kokoro Hindi 5.7%, Piper Hindi 10.8%, Piper Malayalam 38.6% (mostly Whisper's own Malayalam weakness). In Chrome on one WASM thread Piper ran ~4x faster than real time, while Kokoro was 2.6x to 10x *slower*, so Kokoro was dropped.
- **Verified in the browser:** downloaded and played English Kokoro, Hindi Kokoro, Hindi Piper and Malayalam Piper (audio buffers checked, I can't listen); the download offer on a Hindi result spoke 33 s after the click, download included.
- **Listen yourself:** `npm run tts:samples` writes `tts-samples/*.wav` (I also sent them to you). Tell me which voices you prefer and I'll change `DEFAULT_VOICE` in `web/src/lib/tts/voices.ts`.
- **Licences to know:** the Hindi and Malayalam **Piper** voices are trained on **non-commercial** datasets (fine for the contest; Settings labels them). The English Piper voices use public-domain data.
- **Not verified:** the extension side panel's read-aloud (built with `wasm-unsafe-eval` in its CSP, not loaded in Chrome).

## Added later: Call Guard and pause before paying

Two features to make SecondLook stand out from paste-a-message checkers. They step in *during* a scam, not after it.

- **Call Guard** (`#/call`, **On a call** in the menu): put a call on speaker; SecondLook recognises speech **on the device** and shows a big *Hang up now* warning as soon as it hears a scam pattern, in English, Hindi or Malayalam. Engines: Chrome's on-device Web Speech (`processLocally`), else Gemini Nano audio (Prompt API directly, since the Firebase SDK's on-device adapter turns all inline data into images). **No cloud path for audio at all.** Also tap-to-answer questions, typing, a labelled demo call, and a Nano second opinion.
- **Pause before paying** (`#/pause`, linked from medium/high results and Call Guard): countdown, four questions, a big *Call [trusted person]* button (stored only on the device, set in Settings), 1930, family alert. **Extension:** a banner on bank-transfer / add-payee / UPI send / gift-card pages asks *"Is someone on the phone telling you to do this?"*
- New rules: `safe_account` ("transfer to the RBI verification account") and `remote_access` (AnyDesk, screen sharing), plus Hindi and Malayalam terms for spoken calls. Rules-only eval numbers unchanged.
- **Verified:** unit tests (shared call/payment logic, privacy guards in `listen.ts`, the pages, the extension banner), and in the browser: demo call in English and Hindi, pause screen, result → pause link.
- **Not verified (needs your Chrome and a microphone):** real listening. Check `#/call` in your Chrome: if it says listening is off, Chrome has no on-device speech pack for that language and Nano audio isn't available; the questions still work. Hindi/Malayalam on-device speech packs may not exist yet in Chrome; English (en-US/en-IN) is the most likely to work. Microphone access inside the extension side panel is also untested (Chrome may not show the permission prompt there; the web app is the main surface).

## Added later: Practise saying no

- **`#/practice`** (*Practise* in the menu, and a link on the check screen): three guided practice calls (CBI "digital arrest", KYC block, "new number" son) in English, Hindi and Malayalam. Pick replies, see the trick named and explained, get a score and three things to remember.
- **Free practice:** Gemini Nano plays the scammer on the device (`makePracticeRunner` in `web/src/lib/ai.ts`, `ONLY_ON_DEVICE`, with the same refuse-if-not-on-device guard). Tricks are highlighted by the rules engine. **Not verified with real Nano**: Nano may refuse to play a scammer or write weak lines; tried only with the dev simulator (`?mockNano`). Try it in your Chrome once Nano shows "Ready".

## Added later: Scam radar

- **`#/radar`**: weekly counts of scam *types* per state, this week vs last week; teaser on the check screen; **📡 Add to the scam radar** on medium/high results and in Call Guard; your state in Settings (default: just "India").
- Privacy: the type is worked out on the device; Firestore gets `{week, pattern, region, count +1, updatedAt}` and nothing else. `firestore.rules` enforces it (11/11 rules tests pass in the emulator, 3 of them new for the radar).
- **You need to redeploy the Firestore rules** for the radar to work in your project (the live rules don't have `radar` yet, so the page says "couldn't be loaded"):
  `npx -y -p node@22 -p firebase-tools firebase deploy --only firestore --project secondlook-21f24`
- Writes are allowed without sign-in (so anyone can warn others), which makes **App Check enforcement for Firestore** important before going public.
- Rules tests on this laptop need `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=<a folder path without spaces>` (see step 12 below).

## Added later: new look, Hindi/Malayalam listening, sign-in fix

**Sign-in error `auth/configuration-not-found`:** Google sign-in isn't switched on in the Firebase project yet. Fix it in the console (I can't change your project):
1. Firebase console → **Authentication** → **Get started** (if you haven't clicked it).
2. **Sign-in method** → **Google** → **Enable**, pick a support email, **Save**.
3. **Settings → Authorised domains**: `localhost` is there by default; add your Hosting domain when you deploy.

The app now explains this in plain words instead of showing the raw Firebase code.

**Hindi and Malayalam listening:** Chrome's on-device speech recognition only has English packs, which is why Hindi and Malayalam calls weren't understood. Call Guard now uses **Whisper** (open models from Hugging Face) in a Web Worker for Hindi and Malayalam, and for English when Chrome has no pack:
- Hindi: `onnx-community/whisper-hindi-small-ONNX` (vasista22's Hindi fine-tune of Whisper small, Apache-2.0). Malayalam: `onnx-community/whisper-small` **translating the call into English** (its Malayalam transcripts loop into garbage, but the English translation keeps "arrested", "don't let anyone know", "RBI verification account"). English fallback: `onnx-community/whisper-base`. WebGPU when available (your RTX 3050 laptop has it), WASM otherwise; without WebGPU, Call Guard says warnings may come 20–30 s late and points to the quick questions.
- A one-time download, asked first: about 300 MB for Hindi or Malayalam, 80 MB for English. On this laptop's connection Hugging Face downloads ran at roughly 0.25 MB/s, so expect 15–20 minutes the first time; downloads retry if they drop, and the model is cached afterwards.
- Audio never leaves the device. Whisper sometimes writes Malayalam in Devanagari letters; the app shifts them back before the rules read them, and drops Whisper's made-up text on silence ("Thank you.", "[Music]").
- Measured with `npm run asr:eval` (Piper voices speak the demo scam calls, Whisper listens in 6-second pieces, Call Guard scores them): every language now ends at **high risk / hang up**. See `evals/ASR.md`. Stock whisper-base wrote Hindi in Urdu/Roman script and Malayalam as Tamil, and stock whisper-small looped on Malayalam, which is why those aren't used. The eval also caught a real bug (the Hindi fine-tune rejects a language option), now fixed.
- **Not verified with a real microphone in your Chrome.** Try `#/call` → हिंदी → Start listening → allow the download, then play or speak the Hindi script from DEMO.md near the laptop.

**New look (black and orange, Apple-inspired):** a deep black canvas with a warm orange glow, frosted-glass cards, Inter type set tight (Noto Sans for Hindi and Malayalam; all self-hosted, so offline and private), and one orange gradient for the main actions and the "Someone on the phone?" panel. Verdict colours stay separate from the brand orange (red / yellow / green): a glowing status icon plus a capsule label (SCAM / धोखा / തട്ടിപ്പ്); Call Guard shows a big red "HANG UP" capsule. **No emojis as icons anywhere**: Lucide line icons (MIT) in the app, inlined SVG in the extension banners. Phones get a floating glass tab bar (Check, On a call, Practise, Family, Settings); Alerts, Scam radar and Privacy are in the footer. Dark only, by design. New black-and-orange app and extension icons.

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
