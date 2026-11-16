# Demo script (≤ 3:00)

How to record each shot from PLAN.md section 8 with this build. Everything below assumes the Firebase project is set up (see MORNING.md) and Gemini Nano works in your Chrome.

## Before recording

- `npm run dev` (or the Hosting URL), Chrome with Nano downloaded (**Model** screen → *Download the private model*, then *Test the AI connection* shows 🟢).
- Load the extension from `extension/dist`.
- Open the web app in a second Chrome profile (or another laptop/phone) signed in as the guardian, on **Alerts**.
- Copy these test messages somewhere handy:
  - **CBI / digital arrest:** use the *"CBI officer" call* example button on the check screen.
  - **Hindi:** `मैं मुंबई पुलिस से बोल रहा हूँ। आपके नाम पर गिरफ्तार वारंट है। किसी को मत बताना और वीडियो कॉल पर बने रहिए। 9876543210 पर तुरंत कॉल करें।`
  - **Fake bank page:** the repo ships a clearly labelled, fictional demo page (`web/public/demo/fake-login.html`, "Demo Bank", no real brand). To give it a scam-like address locally, add this line to `C:\Windows\System32\drivers\etc\hosts` (as admin): `127.0.0.1 secure-kyc-update.top`, then with `npm run dev` running open `http://secure-kyc-update.top:5173/demo/fake-login.html`. The banner fires because the address has hyphens, a `.top` ending, "kyc"/"secure"/"update" and no HTTPS, and the page asks for a password and an OTP (score 56). Remove the hosts line afterwards.

## Shots

| Time | Shot | What to do | What the viewer sees |
|---|---|---|---|
| 0:00–0:20 | The problem | Title card: ₹4,057 crore lost to "digital arrest" scams (2022–May 2026). Show the CBI message in WhatsApp Web. | |
| 0:20–0:50 | On-device check | In WhatsApp Web, select the CBI message → right-click → **Check with SecondLook**. Then turn Wi-Fi off and do it again. | Side panel: ⛔ *This looks like a scam*, risk bar, highlighted warning signs (digital arrest, secrecy, authority), advice to hang up and call 1930, **🟢 Checked on this device. Nothing was sent anywhere.** Same result offline. |
| 0:50–1:20 | Fake bank page | Open the demo login page at `secure-kyc-update.top`. | The red banner: *Careful: don't type passwords or card numbers here*, with reasons (risky `.top` ending, "kyc" in the address, no secure connection). *Leave this page* / *Check with SecondLook*. (On a real look-alike such as `sbi-kyc-verify.top` it also says *mentions SBI but isn't its real website*.) |
| 1:20–1:50 | Hindi → cloud | Web app: paste the Hindi message. Pause on the line under the box before pressing *Check*. Then check, and open **See exactly what was sent**. | Preview: *🔵 Will remove personal details, then check in the cloud. The private model isn't tested for Hindi yet.* Result: **🔵 Checked in the cloud, with personal details removed: 1 phone number.** The drawer shows `[PHONE_1]` in place of the number. (On Android the same route is forced by Android's language limits; on this S23 there's no on-device model at all, which is the honest fallback.) |
| 1:50–2:20 | Family alert | On the result, press **Let my family know**. Cut to the guardian's screen. | Guardian's Alerts page updates live: *Dad: 3 scam signals (fake authority, secrecy, money request), just now*, with 🟢/🔵 source. No message text anywhere (Firestore rules forbid it). |
| 2:20–2:40 | Remote Config | Check the FASTag message: *"Your FASTag will be blocked today. Renew KYC now at fastag-renew.top"* → ✅ no strong signs (score 0). In the Remote Config console, publish the FASTag rule from the README and a *scam_of_the_week*. Reload and check again. | The banner *Scam of the week* appears and the same message now shows ⚠️ *Be careful* with *Fake FASTag renewal* as a warning sign. |
| 2:40–3:00 | Evidence | Show the **Privacy** page (live routing table for this device), the eval table in the README, the architecture diagram, the repo and the Hosting URL. | Rules vs on-device vs cloud accuracy and latency; redaction 26/26. |

## Good extra moments (if time allows)

- **Follow-up:** after the CBI result, tap *I already paid. What now?* The answer comes from the cloud (follow-ups are multi-turn) with the original message redacted; the badge and the drawer prove it.
- **Never use the cloud:** Settings → turn it on, then check the Hindi message again: it runs on the device with a note that accuracy may be lower, and nothing is sent.
- **Screenshot:** add a screenshot of a scam SMS. With Nano it's read on the device; without Nano the app *asks* before sending a picture, because pictures can't be redacted.
