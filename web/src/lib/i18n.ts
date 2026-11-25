// UI language for the core flow used by older people: check, result, badges, follow-up, family
// button, onboarding and settings. Hindi and Malayalam strings are first drafts and should be
// reviewed by native speakers. Guardian/family/privacy/dev pages stay in English for now.
import { RADAR_PATTERN_LABELS, type Level, type RadarPattern, type Redaction, type RedactionType, type RouteDecision, type SignalId, type VerdictSignal } from "@secondlook/shared";

export type UiLang = "en" | "hi" | "ml";
export const UI_LANGS: { id: UiLang; name: string }[] = [
  { id: "en", name: "English" },
  { id: "hi", name: "हिंदी" },
  { id: "ml", name: "മലയാളം" },
];

type Entry = Record<UiLang, string>;

const D = {
  "nav.check": { en: "Check", hi: "जाँचें", ml: "പരിശോധിക്കുക" },
  "nav.family": { en: "Family", hi: "परिवार", ml: "കുടുംബം" },
  "nav.alerts": { en: "Alerts", hi: "अलर्ट", ml: "അലേർട്ടുകൾ" },
  "nav.privacy": { en: "Privacy", hi: "निजता", ml: "സ്വകാര്യത" },
  "nav.settings": { en: "Settings", hi: "सेटिंग्स", ml: "ക്രമീകരണങ്ങൾ" },
  "footer": {
    en: "SecondLook gives a second opinion, not a guarantee. In India, report scams at {site} or call 1930.",
    hi: "SecondLook दूसरी राय देता है, गारंटी नहीं। भारत में धोखाधड़ी की शिकायत {site} पर करें या 1930 पर कॉल करें।",
    ml: "SecondLook ഒരു രണ്ടാം അഭിപ്രായം മാത്രമാണ്, ഉറപ്പല്ല. ഇന്ത്യയിൽ തട്ടിപ്പുകൾ {site}-ൽ റിപ്പോർട്ട് ചെയ്യുക, അല്ലെങ്കിൽ 1930-ൽ വിളിക്കുക.",
  },

  "check.title": { en: "Is this a scam?", hi: "क्या यह धोखाधड़ी है?", ml: "ഇതൊരു തട്ടിപ്പാണോ?" },
  "check.lead": {
    en: "Paste a message you're unsure about, or add a screenshot. We check it on your device first.",
    hi: "जिस संदेश पर शक हो, उसे यहाँ चिपकाएँ या स्क्रीनशॉट जोड़ें। हम पहले आपके डिवाइस पर ही जाँच करते हैं।",
    ml: "സംശയമുള്ള സന്ദേശം ഇവിടെ ഒട്ടിക്കുക, അല്ലെങ്കിൽ ഒരു സ്ക്രീൻഷോട്ട് ചേർക്കുക. ആദ്യം നിങ്ങളുടെ ഉപകരണത്തിൽ തന്നെയാണ് പരിശോധന.",
  },
  "check.label": { en: "The message", hi: "संदेश", ml: "സന്ദേശം" },
  "check.placeholder": { en: "Paste the message here…", hi: "संदेश यहाँ चिपकाएँ…", ml: "സന്ദേശം ഇവിടെ ഒട്ടിക്കുക…" },
  "check.addShot": { en: "Add a screenshot", hi: "स्क्रीनशॉट जोड़ें", ml: "സ്ക്രീൻഷോട്ട് ചേർക്കുക" },
  "check.changeShot": { en: "Change screenshot", hi: "स्क्रीनशॉट बदलें", ml: "സ്ക്രീൻഷോട്ട് മാറ്റുക" },
  "check.remove": { en: "Remove", hi: "हटाएँ", ml: "നീക്കം ചെയ്യുക" },
  "check.shotAlt": { en: "Screenshot to check", hi: "जाँचने के लिए स्क्रीनशॉट", ml: "പരിശോധിക്കാനുള്ള സ്ക്രീൻഷോട്ട്" },
  "check.button": { en: "Check this message", hi: "यह संदेश जाँचें", ml: "ഈ സന്ദേശം പരിശോധിക്കുക" },
  "check.checking": { en: "Checking…", hi: "जाँच हो रही है…", ml: "പരിശോധിക്കുന്നു…" },
  "check.privateModel": { en: "Private model:", hi: "निजी मॉडल:", ml: "സ്വകാര്യ മോഡൽ:" },
  "check.setUp": { en: "Set up", hi: "सेट अप करें", ml: "സജ്ജമാക്കുക" },
  "check.cloudOff": { en: "Cloud is off", hi: "क्लाउड बंद है", ml: "ക്ലൗഡ് ഓഫാണ്" },
  "check.simulated": { en: "(simulated, dev only)", hi: "(सिम्युलेटेड, सिर्फ़ डेवलपर के लिए)", ml: "(സിമുലേറ്റഡ്, ഡെവലപ്പർമാർക്ക് മാത്രം)" },
  "check.tryExample": { en: "Try an example:", hi: "उदाहरण आज़माएँ:", ml: "ഒരു ഉദാഹരണം നോക്കൂ:" },
  "check.badImage": { en: "We couldn't open that picture. Try a PNG or JPEG screenshot.", hi: "यह तस्वीर नहीं खुल पाई। PNG या JPEG स्क्रीनशॉट आज़माएँ।", ml: "ആ ചിത്രം തുറക്കാനായില്ല. PNG അല്ലെങ്കിൽ JPEG സ്ക്രീൻഷോട്ട് നോക്കൂ." },
  "notice.aiOff": { en: "AI not configured.", hi: "AI सेट नहीं है।", ml: "AI സജ്ജമാക്കിയിട്ടില്ല." },
  "notice.rulesOnly": {
    en: "SecondLook is running quick checks (rules only, on this device). Add the Firebase settings to turn on the AI check.",
    hi: "SecondLook अभी त्वरित जाँच कर रहा है (सिर्फ़ नियम, इसी डिवाइस पर)। AI जाँच चालू करने के लिए Firebase सेटिंग्स जोड़ें।",
    ml: "SecondLook ഇപ്പോൾ പെട്ടെന്നുള്ള പരിശോധന മാത്രമാണ് നടത്തുന്നത് (നിയമങ്ങൾ മാത്രം, ഈ ഉപകരണത്തിൽ). AI പരിശോധന ഓണാക്കാൻ Firebase ക്രമീകരണങ്ങൾ ചേർക്കുക.",
  },
  "notice.simulated": {
    en: "Using a simulated on-device model (developer mode). The cloud check is off.",
    hi: "सिम्युलेटेड ऑन-डिवाइस मॉडल चल रहा है (डेवलपर मोड)। क्लाउड जाँच बंद है।",
    ml: "സിമുലേറ്റഡ് ഓൺ-ഡിവൈസ് മോഡൽ ഉപയോഗിക്കുന്നു (ഡെവലപ്പർ മോഡ്). ക്ലൗഡ് പരിശോധന ഓഫാണ്.",
  },
  "notice.week": { en: "Scam of the week:", hi: "इस हफ़्ते का स्कैम:", ml: "ഈ ആഴ്ചത്തെ തട്ടിപ്പ്:" },

  "consent.title": { en: "Send this screenshot to the cloud?", hi: "क्या यह स्क्रीनशॉट क्लाउड पर भेजें?", ml: "ഈ സ്ക്രീൻഷോട്ട് ക്ലൗഡിലേക്ക് അയയ്ക്കണോ?" },
  "consent.body": {
    en: "The private model isn't available on this device. We can remove personal details from typed text, but not from pictures. If you send it, the whole screenshot goes to Google's Gemini model to be checked.",
    hi: "इस डिवाइस पर निजी मॉडल उपलब्ध नहीं है। हम लिखे हुए संदेश से निजी जानकारी हटा सकते हैं, पर तस्वीरों से नहीं। भेजने पर पूरा स्क्रीनशॉट जाँच के लिए Google के Gemini मॉडल को जाएगा।",
    ml: "ഈ ഉപകരണത്തിൽ സ്വകാര്യ മോഡൽ ലഭ്യമല്ല. ടൈപ്പ് ചെയ്ത സന്ദേശത്തിൽ നിന്ന് വ്യക്തിഗത വിവരങ്ങൾ നീക്കാൻ കഴിയും, പക്ഷേ ചിത്രങ്ങളിൽ നിന്ന് കഴിയില്ല. അയച്ചാൽ മുഴുവൻ സ്ക്രീൻഷോട്ടും പരിശോധനയ്ക്കായി Google-ന്റെ Gemini മോഡലിലേക്ക് പോകും.",
  },
  "consent.send": { en: "Send the screenshot", hi: "स्क्रीनशॉट भेजें", ml: "സ്ക്രീൻഷോട്ട് അയയ്ക്കുക" },
  "consent.keep": { en: "Keep it on my device", hi: "मेरे डिवाइस पर ही रखें", ml: "എന്റെ ഉപകരണത്തിൽ തന്നെ വെക്കുക" },

  "nano.available": { en: "Ready. Checks run on this device.", hi: "तैयार। जाँच इसी डिवाइस पर होती है।", ml: "തയ്യാർ. പരിശോധന ഈ ഉപകരണത്തിൽ തന്നെ നടക്കും." },
  "nano.downloadable": { en: "Not downloaded yet.", hi: "अभी डाउनलोड नहीं हुआ।", ml: "ഇതുവരെ ഡൗൺലോഡ് ചെയ്തിട്ടില്ല." },
  "nano.downloading": { en: "Downloading…", hi: "डाउनलोड हो रहा है…", ml: "ഡൗൺലോഡ് ചെയ്യുന്നു…" },
  "nano.unavailable": { en: "This device can't run the private model.", hi: "यह डिवाइस निजी मॉडल नहीं चला सकता।", ml: "ഈ ഉപകരണത്തിൽ സ്വകാര്യ മോഡൽ പ്രവർത്തിക്കില്ല." },
  "nano.unsupported": {
    en: "This browser doesn't have the private model (needs Chrome 139+ on a computer).",
    hi: "इस ब्राउज़र में निजी मॉडल नहीं है (कंप्यूटर पर Chrome 139 या नया चाहिए)।",
    ml: "ഈ ബ്രൗസറിൽ സ്വകാര്യ മോഡൽ ഇല്ല (കമ്പ്യൂട്ടറിൽ Chrome 139 അല്ലെങ്കിൽ പുതിയത് വേണം).",
  },

  "result.high": { en: "This looks like a scam", hi: "यह धोखाधड़ी लगती है", ml: "ഇതൊരു തട്ടിപ്പാണെന്ന് തോന്നുന്നു" },
  "result.medium": { en: "Be careful with this one", hi: "इससे सावधान रहें", ml: "ഇതിൽ ശ്രദ്ധിക്കുക" },
  "result.low": { en: "No strong scam signs", hi: "धोखाधड़ी के कोई बड़े संकेत नहीं", ml: "തട്ടിപ്പിന്റെ വലിയ സൂചനകളൊന്നുമില്ല" },
  "result.unknown": { en: "We couldn't read this", hi: "हम इसे पढ़ नहीं पाए", ml: "ഇത് വായിക്കാനായില്ല" },
  "result.risk": { en: "Risk {n}/100", hi: "जोखिम {n}/100", ml: "അപകടസാധ്യത {n}/100" },
  "result.riskLabel": { en: "Scam risk {n} out of 100", hi: "धोखाधड़ी का जोखिम 100 में से {n}", ml: "തട്ടിപ്പ് സാധ്യത 100-ൽ {n}" },
  "result.whatToDo": { en: "What to do:", hi: "क्या करें:", ml: "എന്ത് ചെയ്യണം:" },
  "result.signs": { en: "Warning signs we found", hi: "हमें मिले चेतावनी संकेत", ml: "ഞങ്ങൾ കണ്ടെത്തിയ മുന്നറിയിപ്പ് സൂചനകൾ" },
  "result.rulesLeadHigh": { en: "This looks like a scam.", hi: "यह धोखाधड़ी लगती है।", ml: "ഇതൊരു തട്ടിപ്പാണെന്ന് തോന്നുന്നു." },
  "result.rulesLeadMedium": { en: "This has some warning signs.", hi: "इसमें कुछ चेतावनी संकेत हैं।", ml: "ഇതിൽ ചില മുന്നറിയിപ്പ് സൂചനകളുണ്ട്." },
  "result.rulesLeadLow": { en: "This has a small warning sign.", hi: "इसमें एक छोटा चेतावनी संकेत है।", ml: "ഇതിൽ ഒരു ചെറിയ മുന്നറിയിപ്പ് സൂചനയുണ്ട്." },
  "result.rulesFound": { en: "We found: {list}.", hi: "हमें मिला: {list}।", ml: "ഞങ്ങൾ കണ്ടെത്തിയത്: {list}." },
  "result.rulesNone": { en: "We didn't find the usual warning signs of a scam in this message.", hi: "इस संदेश में धोखाधड़ी के आम चेतावनी संकेत नहीं मिले।", ml: "ഈ സന്ദേശത്തിൽ തട്ടിപ്പിന്റെ സാധാരണ മുന്നറിയിപ്പ് സൂചനകൾ കണ്ടില്ല." },
  "result.inEnglish": { en: "", hi: "(AI का जवाब अंग्रेज़ी में है)", ml: "(AI മറുപടി ഇംഗ്ലീഷിലാണ്)" },

  "badge.deviceTitle": { en: "Checked on this device.", hi: "इसी डिवाइस पर जाँचा गया।", ml: "ഈ ഉപകരണത്തിൽ തന്നെ പരിശോധിച്ചു." },
  "badge.deviceBody": { en: "Nothing was sent anywhere.", hi: "कुछ भी कहीं नहीं भेजा गया।", ml: "ഒന്നും എവിടേക്കും അയച്ചില്ല." },
  "badge.sim": { en: "(simulated model, dev only)", hi: "(सिम्युलेटेड मॉडल, सिर्फ़ डेवलपर के लिए)", ml: "(സിമുലേറ്റഡ് മോഡൽ, ഡെവലപ്പർമാർക്ക് മാത്രം)" },
  "badge.cloudTitle": { en: "Checked in the cloud", hi: "क्लाउड में जाँचा गया", ml: "ക്ലൗഡിൽ പരിശോധിച്ചു" },
  "badge.sentTitle": { en: "Sent to the cloud", hi: "क्लाउड पर भेजा गया", ml: "ക്ലൗഡിലേക്ക് അയച്ചു" },
  "badge.removed": { en: ", with personal details removed: {list}.", hi: ", निजी जानकारी हटाकर: {list}।", ml: ", വ്യക്തിഗത വിവരങ്ങൾ നീക്കിയ ശേഷം: {list}." },
  "badge.noneFound": { en: ". No personal details were found to remove.", hi: "। हटाने लायक कोई निजी जानकारी नहीं मिली।", ml: ". നീക്കം ചെയ്യേണ്ട വ്യക്തിഗത വിവരങ്ങളൊന്നും കണ്ടില്ല." },
  "badge.image": { en: "The screenshot was sent as you allowed.", hi: "आपकी अनुमति से स्क्रीनशॉट भेजा गया।", ml: "നിങ്ങളുടെ അനുമതിയോടെ സ്ക്രീൻഷോട്ട് അയച്ചു." },
  "badge.unusable": { en: "Its answer couldn't be used, so this is a quick-check result.", hi: "उसका जवाब काम का नहीं था, इसलिए यह त्वरित जाँच का नतीजा है।", ml: "അതിന്റെ മറുപടി ഉപയോഗിക്കാനായില്ല, അതിനാൽ ഇത് പെട്ടെന്നുള്ള പരിശോധനയുടെ ഫലമാണ്." },
  "badge.rulesTitle": { en: "Quick check.", hi: "त्वरित जाँच।", ml: "പെട്ടെന്നുള്ള പരിശോധന." },
  "badge.rulesBody": { en: "Rules only, on this device. No AI model was used.", hi: "सिर्फ़ नियम, इसी डिवाइस पर। कोई AI मॉडल इस्तेमाल नहीं हुआ।", ml: "നിയമങ്ങൾ മാത്രം, ഈ ഉപകരണത്തിൽ. AI മോഡൽ ഉപയോഗിച്ചില്ല." },

  "drawer.show": { en: "See exactly what was sent", hi: "देखें कि ठीक-ठीक क्या भेजा गया", ml: "എന്താണ് അയച്ചതെന്ന് കൃത്യമായി കാണുക" },
  "drawer.hide": { en: "Hide what was sent", hi: "भेजी गई जानकारी छिपाएँ", ml: "അയച്ചത് മറയ്ക്കുക" },
  "drawer.intro": { en: "This is everything that left your device:", hi: "आपके डिवाइस से बस इतना ही बाहर गया:", ml: "നിങ്ങളുടെ ഉപകരണത്തിൽ നിന്ന് പുറത്തുപോയത് ഇത് മാത്രമാണ്:" },
  "drawer.introImage": { en: "This is everything that left your device, plus the screenshot you allowed:", hi: "आपके डिवाइस से बस इतना बाहर गया, और आपकी अनुमति से स्क्रीनशॉट:", ml: "നിങ്ങളുടെ ഉപകരണത്തിൽ നിന്ന് പുറത്തുപോയത് ഇത് മാത്രം, കൂടെ നിങ്ങൾ അനുവദിച്ച സ്ക്രീൻഷോട്ടും:" },
  "drawer.showMap": { en: "Show what each placeholder stands for (stays on this device)", hi: "हर लेबल का असली मतलब दिखाएँ (यह इसी डिवाइस पर रहता है)", ml: "ഓരോ ലേബലും എന്താണെന്ന് കാണിക്കുക (ഇത് ഈ ഉപകരണത്തിൽ തന്നെ നിൽക്കും)" },
  "drawer.hideMap": { en: "Hide what each placeholder stands for", hi: "लेबल का मतलब छिपाएँ", ml: "ലേബലുകളുടെ അർത്ഥം മറയ്ക്കുക" },

  "preview.device": { en: "Will be checked on this device. Nothing will be sent.", hi: "इसी डिवाइस पर जाँचा जाएगा। कुछ भी नहीं भेजा जाएगा।", ml: "ഈ ഉപകരണത്തിൽ തന്നെ പരിശോധിക്കും. ഒന്നും അയയ്ക്കില്ല." },
  "preview.cloud": { en: "Will remove personal details, then check in the cloud.", hi: "निजी जानकारी हटाकर क्लाउड में जाँचा जाएगा।", ml: "വ്യക്തിഗത വിവരങ്ങൾ നീക്കിയ ശേഷം ക്ലൗഡിൽ പരിശോധിക്കും." },
  "preview.rules": { en: "Will run a quick check on this device.", hi: "इसी डिवाइस पर त्वरित जाँच होगी।", ml: "ഈ ഉപകരണത്തിൽ പെട്ടെന്നുള്ള പരിശോധന നടത്തും." },
  "preview.image": { en: "We'll ask before sending the screenshot.", hi: "स्क्रीनशॉट भेजने से पहले हम आपसे पूछेंगे।", ml: "സ്ക്രീൻഷോട്ട് അയയ്ക്കുന്നതിന് മുമ്പ് ഞങ്ങൾ ചോദിക്കും." },

  "followup.title": { en: "Have a question?", hi: "कोई सवाल है?", ml: "എന്തെങ്കിലും ചോദിക്കാനുണ്ടോ?" },
  "followup.q1": { en: "What should I do now?", hi: "अब मुझे क्या करना चाहिए?", ml: "ഇനി ഞാൻ എന്ത് ചെയ്യണം?" },
  "followup.q2": { en: "I already paid. What now?", hi: "मैंने पैसे भेज दिए। अब क्या करूँ?", ml: "ഞാൻ പണം അയച്ചുപോയി. ഇനി എന്ത് ചെയ്യും?" },
  "followup.q3": { en: "How can I check if it's real?", hi: "कैसे पता करूँ कि यह असली है?", ml: "ഇത് യഥാർത്ഥമാണോ എന്ന് എങ്ങനെ അറിയാം?" },
  "followup.input": { en: "Your question", hi: "आपका सवाल", ml: "നിങ്ങളുടെ ചോദ്യം" },
  "followup.placeholder": { en: "Type your question…", hi: "अपना सवाल लिखें…", ml: "നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക…" },
  "followup.ask": { en: "Ask", hi: "पूछें", ml: "ചോദിക്കുക" },
  "followup.thinking": { en: "Thinking…", hi: "सोच रहे हैं…", ml: "ആലോചിക്കുന്നു…" },
  "followup.youAsked": { en: "You asked: {q}", hi: "आपने पूछा: {q}", ml: "നിങ്ങൾ ചോദിച്ചത്: {q}" },

  "family.button": { en: "Let my family know", hi: "मेरे परिवार को बताएँ", ml: "എന്റെ കുടുംബത്തെ അറിയിക്കുക" },
  "family.sending": { en: "Telling your family…", hi: "परिवार को बता रहे हैं…", ml: "കുടുംബത്തെ അറിയിക്കുന്നു…" },
  "family.note": { en: "They'll see the warning signs and the time. Not the message.", hi: "उन्हें चेतावनी संकेत और समय दिखेगा, संदेश नहीं।", ml: "അവർക്ക് മുന്നറിയിപ്പ് സൂചനകളും സമയവും മാത്രം കാണാം. സന്ദേശം കാണില്ല." },
  "family.sent": {
    en: "✔ Your family has been told. They see only the warning signs, never your message.",
    hi: "✔ आपके परिवार को बता दिया गया है। उन्हें सिर्फ़ चेतावनी संकेत दिखते हैं, आपका संदेश कभी नहीं।",
    ml: "✔ നിങ്ങളുടെ കുടുംബത്തെ അറിയിച്ചു. അവർക്ക് മുന്നറിയിപ്പ് സൂചനകൾ മാത്രമേ കാണൂ, നിങ്ങളുടെ സന്ദേശം ഒരിക്കലും കാണില്ല.",
  },
  "family.error": { en: "Couldn't send the alert. Please try again.", hi: "अलर्ट नहीं भेजा जा सका। फिर कोशिश करें।", ml: "അലേർട്ട് അയയ്ക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക." },
  "family.hint": { en: "Want a family member to know when this happens?", hi: "क्या आप चाहते हैं कि ऐसा होने पर परिवार के किसी सदस्य को पता चले?", ml: "ഇങ്ങനെ സംഭവിക്കുമ്പോൾ കുടുംബത്തിലെ ഒരാൾ അറിയണോ?" },
  "family.hintLink": { en: "Set up your family circle", hi: "अपना परिवार समूह बनाएँ", ml: "നിങ്ങളുടെ കുടുംബ ഗ്രൂപ്പ് സജ്ജമാക്കുക" },

  "setup.title": { en: "Welcome to SecondLook", hi: "SecondLook में आपका स्वागत है", ml: "SecondLook-ലേക്ക് സ്വാഗതം" },
  "setup.lead": { en: "A second pair of eyes before you pay, share a code, or click a link.", hi: "पैसे भेजने, कोड बताने या लिंक खोलने से पहले एक दूसरी नज़र।", ml: "പണം അയയ്ക്കുന്നതിനോ കോഡ് പങ്കിടുന്നതിനോ ലിങ്ക് തുറക്കുന്നതിനോ മുമ്പ് ഒരു രണ്ടാം നോട്ടം." },
  "setup.step1": {
    en: "Checks happen on your device first. A small private AI model reads the message right here. Nothing is uploaded.",
    hi: "जाँच पहले आपके डिवाइस पर होती है। एक छोटा निजी AI मॉडल संदेश यहीं पढ़ता है। कुछ भी अपलोड नहीं होता।",
    ml: "പരിശോധന ആദ്യം നിങ്ങളുടെ ഉപകരണത്തിൽ തന്നെ. ഒരു ചെറിയ സ്വകാര്യ AI മോഡൽ സന്ദേശം ഇവിടെ തന്നെ വായിക്കുന്നു. ഒന്നും അപ്‌ലോഡ് ചെയ്യുന്നില്ല.",
  },
  "setup.step2": {
    en: "If your device can't do it, we remove phone numbers, account numbers, names and codes first, then ask a bigger model in the cloud. You can always see exactly what was sent, or switch the cloud off.",
    hi: "अगर आपका डिवाइस यह नहीं कर सकता, तो हम पहले फ़ोन नंबर, खाता नंबर, नाम और कोड हटाते हैं, फिर क्लाउड के बड़े मॉडल से पूछते हैं। आप हमेशा देख सकते हैं कि क्या भेजा गया, या क्लाउड बंद कर सकते हैं।",
    ml: "നിങ്ങളുടെ ഉപകരണത്തിന് കഴിയില്ലെങ്കിൽ, ഫോൺ നമ്പറുകൾ, അക്കൗണ്ട് നമ്പറുകൾ, പേരുകൾ, കോഡുകൾ എന്നിവ ആദ്യം നീക്കിയ ശേഷം ക്ലൗഡിലെ വലിയ മോഡലിനോട് ചോദിക്കും. എന്താണ് അയച്ചതെന്ന് എപ്പോഴും കാണാം, അല്ലെങ്കിൽ ക്ലൗഡ് ഓഫാക്കാം.",
  },
  "setup.step3": {
    en: "Your family can be told, not shown. If you want, someone you trust gets a short alert with the warning signs only. Never your messages.",
    hi: "परिवार को बताया जा सकता है, दिखाया नहीं जाता। आप चाहें तो किसी भरोसेमंद व्यक्ति को सिर्फ़ चेतावनी संकेतों वाला छोटा अलर्ट मिलेगा। आपके संदेश कभी नहीं।",
    ml: "കുടുംബത്തെ അറിയിക്കാം, കാണിക്കില്ല. വേണമെങ്കിൽ, നിങ്ങൾ വിശ്വസിക്കുന്ന ഒരാൾക്ക് മുന്നറിയിപ്പ് സൂചനകൾ മാത്രമുള്ള ഒരു ചെറിയ അലേർട്ട് ലഭിക്കും. നിങ്ങളുടെ സന്ദേശങ്ങൾ ഒരിക്കലുമില്ല.",
  },
  "setup.model": { en: "The private model", hi: "निजी मॉडल", ml: "സ്വകാര്യ മോഡൽ" },
  "setup.status": { en: "Status:", hi: "स्थिति:", ml: "നില:" },
  "setup.download": { en: "Download the private model (one time)", hi: "निजी मॉडल डाउनलोड करें (सिर्फ़ एक बार)", ml: "സ്വകാര്യ മോഡൽ ഡൗൺലോഡ് ചെയ്യുക (ഒരിക്കൽ മാത്രം)" },
  "setup.ready": { en: "✔ Ready. Your checks stay on this device.", hi: "✔ तैयार। आपकी जाँच इसी डिवाइस पर रहती है।", ml: "✔ തയ്യാർ. നിങ്ങളുടെ പരിശോധനകൾ ഈ ഉപകരണത്തിൽ തന്നെ." },
  "setup.start": { en: "Start checking messages", hi: "संदेश जाँचना शुरू करें", ml: "സന്ദേശങ്ങൾ പരിശോധിച്ചു തുടങ്ങുക" },
  "setup.language": { en: "Language", hi: "भाषा", ml: "ഭാഷ" },

  "settings.title": { en: "Settings", hi: "सेटिंग्स", ml: "ക്രമീകരണങ്ങൾ" },
  "settings.neverCloud": { en: "Never use the cloud", hi: "क्लाउड का कभी इस्तेमाल न करें", ml: "ക്ലൗഡ് ഒരിക്കലും ഉപയോഗിക്കരുത്" },
  "settings.neverCloudHelp": {
    en: "Checks stay on this device. If the private model isn't available, you get a quick rules check instead.",
    hi: "जाँच इसी डिवाइस पर रहती है। निजी मॉडल न हो तो उसकी जगह नियमों वाली त्वरित जाँच होगी।",
    ml: "പരിശോധനകൾ ഈ ഉപകരണത്തിൽ തന്നെ. സ്വകാര്യ മോഡൽ ലഭ്യമല്ലെങ്കിൽ, പകരം നിയമങ്ങൾ മാത്രമുള്ള പെട്ടെന്നുള്ള പരിശോധന.",
  },
  "settings.familyAlerts": { en: "Offer to tell my family", hi: "परिवार को बताने का विकल्प दिखाएँ", ml: "കുടുംബത്തെ അറിയിക്കാനുള്ള ഓപ്ഷൻ കാണിക്കുക" },
  "settings.familyAlertsHelp": {
    en: "After a risky result, show a button to alert your family circle (warning signs only).",
    hi: "जोखिम भरे नतीजे के बाद परिवार समूह को अलर्ट करने का बटन दिखाएँ (सिर्फ़ चेतावनी संकेत)।",
    ml: "അപകടസാധ്യതയുള്ള ഫലത്തിന് ശേഷം കുടുംബ ഗ്രൂപ്പിനെ അറിയിക്കാനുള്ള ബട്ടൺ കാണിക്കുക (മുന്നറിയിപ്പ് സൂചനകൾ മാത്രം).",
  },
  "settings.largeText": { en: "Extra large text", hi: "बहुत बड़े अक्षर", ml: "വളരെ വലിയ അക്ഷരങ്ങൾ" },
  "settings.largeTextHelp": { en: "Makes everything bigger.", hi: "सब कुछ बड़ा दिखेगा।", ml: "എല്ലാം വലുതായി കാണിക്കും." },
  "settings.languageHelp": { en: "Hindi and Malayalam are first drafts.", hi: "हिंदी अनुवाद अभी शुरुआती है।", ml: "മലയാളം പരിഭാഷ ഇപ്പോൾ ആദ്യ രൂപമാണ്." },
  "tts.read": { en: "Read aloud", hi: "सुनें", ml: "കേൾക്കുക" },
  "tts.stop": { en: "Stop", hi: "रोकें", ml: "നിർത്തുക" },
  "tts.loading": { en: "Getting the voice ready…", hi: "आवाज़ तैयार हो रही है…", ml: "ശബ്ദം തയ്യാറാക്കുന്നു…" },
  "tts.downloading": { en: "Downloading the voice… {pct}%", hi: "आवाज़ डाउनलोड हो रही है… {pct}%", ml: "ശബ്ദം ഡൗൺലോഡ് ചെയ്യുന്നു… {pct}%" },
  "tts.offer": {
    en: "To hear this, download a {lang} voice once ({mb} MB). It runs on this device: your message is never sent anywhere to be read out.",
    hi: "इसे सुनने के लिए एक बार {lang} आवाज़ डाउनलोड करें ({mb} MB)। यह इसी डिवाइस पर चलती है: पढ़कर सुनाने के लिए आपका संदेश कहीं नहीं भेजा जाता।",
    ml: "ഇത് കേൾക്കാൻ ഒരിക്കൽ {lang} ശബ്ദം ഡൗൺലോഡ് ചെയ്യുക ({mb} MB). ഇത് ഈ ഉപകരണത്തിൽ തന്നെ പ്രവർത്തിക്കുന്നു: വായിച്ചു കേൾപ്പിക്കാൻ നിങ്ങളുടെ സന്ദേശം എവിടേക്കും അയയ്ക്കില്ല.",
  },
  "tts.download": { en: "Download the voice", hi: "आवाज़ डाउनलोड करें", ml: "ശബ്ദം ഡൗൺലോഡ് ചെയ്യുക" },
  "tts.notNow": { en: "Not now", hi: "अभी नहीं", ml: "ഇപ്പോൾ വേണ്ട" },
  "tts.failed": { en: "Sorry, the voice couldn't play.", hi: "माफ़ कीजिए, आवाज़ नहीं चल पाई।", ml: "ക്ഷമിക്കണം, ശബ്ദം പ്രവർത്തിച്ചില്ല." },
  "tts.lang.en": { en: "English", hi: "अंग्रेज़ी", ml: "ഇംഗ്ലീഷ്" },
  "tts.lang.hi": { en: "Hindi", hi: "हिंदी", ml: "ഹിന്ദി" },
  "tts.lang.ml": { en: "Malayalam", hi: "मलयालम", ml: "മലയാളം" },
  "settings.voice": { en: "Read aloud", hi: "पढ़कर सुनाना", ml: "വായിച്ചു കേൾപ്പിക്കൽ" },
  "settings.voiceHelp": {
    en: "Open-source voices that run on this device. Each is downloaded once; nothing you check is sent anywhere to be spoken.",
    hi: "ओपन-सोर्स आवाज़ें जो इसी डिवाइस पर चलती हैं। हर आवाज़ एक बार डाउनलोड होती है; बोलने के लिए आपका कुछ भी कहीं नहीं भेजा जाता।",
    ml: "ഈ ഉപകരണത്തിൽ തന്നെ പ്രവർത്തിക്കുന്ന ഓപ്പൺ സോഴ്സ് ശബ്ദങ്ങൾ. ഓരോന്നും ഒരിക്കൽ ഡൗൺലോഡ് ചെയ്യും; വായിക്കാൻ നിങ്ങളുടെ ഒന്നും എവിടേക്കും അയയ്ക്കില്ല.",
  },
  "settings.voiceFor": { en: "{lang} voice", hi: "{lang} आवाज़", ml: "{lang} ശബ്ദം" },
  "settings.systemVoice": { en: "This device's built-in voice", hi: "डिवाइस की अपनी आवाज़", ml: "ഉപകരണത്തിന്റെ സ്വന്തം ശബ്ദം" },
  "settings.noSystemVoice": { en: "No built-in {lang} voice on this device.", hi: "इस डिवाइस में {lang} की अपनी आवाज़ नहीं है।", ml: "ഈ ഉപകരണത്തിൽ {lang} ശബ്ദം ഇല്ല." },
  "settings.downloaded": { en: "Downloaded", hi: "डाउनलोड हो गई", ml: "ഡൗൺലോഡ് ചെയ്തു" },
  "settings.tryVoice": { en: "Try it", hi: "सुनकर देखें", ml: "കേട്ടുനോക്കുക" },
  "settings.deleteVoice": { en: "Remove", hi: "हटाएँ", ml: "നീക്കുക" },
  "settings.slower": { en: "Speak more slowly", hi: "धीरे बोलें", ml: "പതുക്കെ സംസാരിക്കുക" },
  "settings.slowerHelp": { en: "Reads results at a slower pace.", hi: "नतीजे धीमी गति से पढ़े जाएँगे।", ml: "ഫലങ്ങൾ പതുക്കെ വായിക്കും." },
  "settings.autoRead": { en: "Read results aloud automatically", hi: "नतीजे अपने-आप पढ़कर सुनाएँ", ml: "ഫലങ്ങൾ സ്വയം വായിച്ചു കേൾപ്പിക്കുക" },
  "settings.autoReadHelp": { en: "As soon as a check finishes.", hi: "जाँच पूरी होते ही।", ml: "പരിശോധന കഴിഞ്ഞാലുടൻ." },
  "settings.sample": {
    en: "Hello. This is how SecondLook will read your results.",
    hi: "नमस्ते। SecondLook आपके नतीजे इसी तरह पढ़कर सुनाएगा।",
    ml: "നമസ്കാരം. SecondLook നിങ്ങളുടെ ഫലങ്ങൾ ഇങ്ങനെയാണ് വായിച്ചു കേൾപ്പിക്കുക.",
  },
  "settings.nonCommercial": { en: "Non-commercial licence", hi: "गैर-व्यावसायिक लाइसेंस", ml: "വാണിജ്യേതര ലൈസൻസ്" },

  // Call Guard, pause before paying, trusted person
  "nav.call": { en: "On a call", hi: "कॉल पर", ml: "കോളിൽ" },
  "call.title": { en: "On a call right now?", hi: "क्या आप अभी किसी कॉल पर हैं?", ml: "നിങ്ങൾ ഇപ്പോൾ ഒരു കോളിലാണോ?" },
  "call.lead": { en: "Put the call on speaker near this computer. SecondLook listens and warns you in big letters if it sounds like a scam.", hi: "कॉल को स्पीकर पर रखें और फ़ोन इस कंप्यूटर के पास रखें। अगर बात धोखाधड़ी जैसी लगी, तो SecondLook बड़े अक्षरों में चेतावनी देगा।", ml: "കോൾ സ്പീക്കറിലിട്ട് ഫോൺ ഈ കമ്പ്യൂട്ടറിന് അടുത്ത് വയ്ക്കുക. തട്ടിപ്പ് പോലെ തോന്നിയാൽ SecondLook വലിയ അക്ഷരങ്ങളിൽ മുന്നറിയിപ്പ് നൽകും." },
  "call.private": { en: "Everything stays on this device. Nothing you or the caller say is recorded or sent anywhere.", hi: "सब कुछ इसी डिवाइस पर रहता है। आपकी या कॉल करने वाले की कोई बात रिकॉर्ड नहीं होती, न कहीं भेजी जाती है।", ml: "എല്ലാം ഈ ഉപകരണത്തിൽ തന്നെ. നിങ്ങളോ വിളിക്കുന്നയാളോ പറയുന്നതൊന്നും റെക്കോർഡ് ചെയ്യുകയോ എവിടേക്കും അയയ്ക്കുകയോ ഇല്ല." },
  "call.langQ": { en: "Which language is the caller speaking?", hi: "कॉल करने वाला किस भाषा में बोल रहा है?", ml: "വിളിക്കുന്നയാൾ ഏത് ഭാഷയിലാണ് സംസാരിക്കുന്നത്?" },
  "call.start": { en: "🎙️ Start listening", hi: "🎙️ सुनना शुरू करें", ml: "🎙️ കേൾക്കാൻ തുടങ്ങുക" },
  "call.stop": { en: "⏹ Stop listening", hi: "⏹ सुनना बंद करें", ml: "⏹ കേൾക്കുന്നത് നിർത്തുക" },
  "call.listening": { en: "Listening… keep the call on speaker.", hi: "सुन रहे हैं… कॉल स्पीकर पर रखें।", ml: "കേൾക്കുന്നു… കോൾ സ്പീക്കറിൽ തന്നെ വയ്ക്കുക." },
  "call.preparing": { en: "Getting the speech model ready on this device…", hi: "इस डिवाइस पर बोली पहचानने का मॉडल तैयार हो रहा है…", ml: "ഈ ഉപകരണത്തിൽ സംസാരം തിരിച്ചറിയുന്ന മോഡൽ തയ്യാറാക്കുന്നു…" },
  "call.engineSpeech": { en: "Listening with Chrome's on-device speech recognition.", hi: "Chrome की ऑन-डिवाइस बोली पहचान से सुन रहे हैं।", ml: "Chrome-ന്റെ ഉപകരണത്തിലെ സംസാര തിരിച്ചറിയൽ ഉപയോഗിച്ച് കേൾക്കുന്നു." },
  "call.engineNano": { en: "Listening with the private model (Gemini Nano), a few seconds at a time.", hi: "निजी मॉडल (Gemini Nano) से सुन रहे हैं, कुछ-कुछ सेकंड करके।", ml: "സ്വകാര്യ മോഡൽ (Gemini Nano) ഉപയോഗിച്ച് കേൾക്കുന്നു, കുറച്ച് സെക്കൻഡുകൾ വീതം." },
  "call.engineNone": { en: "This browser can't listen on the device, so listening is off. We never send call audio to the cloud. Answer the questions below instead.", hi: "यह ब्राउज़र डिवाइस पर सुन नहीं सकता, इसलिए सुनना बंद है। हम कॉल की आवाज़ कभी क्लाउड पर नहीं भेजते। इसकी जगह नीचे के सवालों के जवाब दें।", ml: "ഈ ബ്രൗസറിന് ഉപകരണത്തിൽ കേൾക്കാൻ കഴിയില്ല, അതിനാൽ കേൾക്കൽ ഓഫാണ്. കോളിന്റെ ശബ്ദം ഞങ്ങൾ ഒരിക്കലും ക്ലൗഡിലേക്ക് അയയ്ക്കില്ല. പകരം താഴെയുള്ള ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകുക." },
  "call.demo": { en: "▶ Watch a demo call", hi: "▶ डेमो कॉल देखें", ml: "▶ ഡെമോ കോൾ കാണുക" },
  "call.demoNote": { en: "Demo: a made-up scam call, typed in. The microphone is not used.", hi: "डेमो: एक बनावटी धोखाधड़ी कॉल, लिखी हुई। माइक्रोफ़ोन इस्तेमाल नहीं हो रहा।", ml: "ഡെമോ: എഴുതിത്തയ്യാറാക്കിയ ഒരു വ്യാജ തട്ടിപ്പ് കോൾ. മൈക്രോഫോൺ ഉപയോഗിക്കുന്നില്ല." },
  "call.allClear": { en: "Nothing worrying heard yet.", hi: "अभी तक कुछ चिंता वाली बात नहीं सुनी।", ml: "ഇതുവരെ ആശങ്കപ്പെടേണ്ടതൊന്നും കേട്ടില്ല." },
  "call.heard": { en: "What we heard", hi: "हमने क्या सुना", ml: "ഞങ്ങൾ കേട്ടത്" },
  "call.transcript": { en: "Show the words we heard", hi: "सुने गए शब्द दिखाएँ", ml: "കേട്ട വാക്കുകൾ കാണിക്കുക" },
  "call.transcriptNote": { en: "Only on this screen. Deleted when you leave this page.", hi: "सिर्फ़ इसी स्क्रीन पर। यह पेज छोड़ते ही मिट जाता है।", ml: "ഈ സ്ക്രീനിൽ മാത്രം. ഈ പേജ് വിട്ടാൽ മായ്ക്കപ്പെടും." },
  "call.hangUp": { en: "Hang up now.", hi: "अभी फ़ोन काट दें।", ml: "ഇപ്പോൾ ഫോൺ കട്ട് ചെയ്യുക." },
  "call.careful": { en: "Be careful. Don't pay or share anything yet.", hi: "सावधान रहें। अभी न पैसे दें, न कुछ बताएँ।", ml: "ശ്രദ്ധിക്കുക. ഇപ്പോൾ പണം നൽകുകയോ ഒന്നും പറയുകയോ ചെയ്യരുത്." },
  "call.questions": { en: "Or answer a few quick questions", hi: "या कुछ आसान सवालों के जवाब दें", ml: "അല്ലെങ്കിൽ കുറച്ച് ചെറിയ ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകുക" },
  "call.yes": { en: "Yes", hi: "हाँ", ml: "അതെ" },
  "call.no": { en: "No", hi: "नहीं", ml: "ഇല്ല" },
  "call.aiSays": { en: "Private AI on this device:", hi: "इस डिवाइस का निजी AI:", ml: "ഈ ഉപകരണത്തിലെ സ്വകാര്യ AI:" },
  "call.typeLabel": { en: "Or type what they said", hi: "या लिखें कि उन्होंने क्या कहा", ml: "അല്ലെങ്കിൽ അവർ പറഞ്ഞത് എഴുതുക" },
  "call.add": { en: "Add", hi: "जोड़ें", ml: "ചേർക്കുക" },
  "call.reset": { en: "Start over", hi: "फिर से शुरू करें", ml: "വീണ്ടും തുടങ്ങുക" },
  "call.banner": { en: "📞 Someone on the phone with you right now? Turn on Call Guard", hi: "📞 क्या अभी कोई आपसे फ़ोन पर बात कर रहा है? कॉल गार्ड चालू करें", ml: "📞 ഇപ്പോൾ ആരെങ്കിലും ഫോണിൽ സംസാരിക്കുന്നുണ്ടോ? കോൾ ഗാർഡ് ഓണാക്കുക" },
  "call.micError": { en: "Couldn't use the microphone. Allow it in the address bar, or answer the questions below.", hi: "माइक्रोफ़ोन इस्तेमाल नहीं हो सका। एड्रेस बार में अनुमति दें, या नीचे के सवालों के जवाब दें।", ml: "മൈക്രോഫോൺ ഉപയോഗിക്കാനായില്ല. അഡ്രസ് ബാറിൽ അനുവദിക്കുക, അല്ലെങ്കിൽ താഴെയുള്ള ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകുക." },
  "trusted.call": { en: "📞 Call {name}", hi: "📞 {name} को फ़ोन करें", ml: "📞 {name}-നെ വിളിക്കുക" },
  "trusted.call1930": { en: "📞 Call 1930 (cyber crime helpline)", hi: "📞 1930 पर कॉल करें (साइबर क्राइम हेल्पलाइन)", ml: "📞 1930-ൽ വിളിക്കുക (സൈബർ ക്രൈം ഹെൽപ്‌ലൈൻ)" },
  "trusted.title": { en: "Your trusted person", hi: "आपका भरोसेमंद व्यक्ति", ml: "നിങ്ങൾ വിശ്വസിക്കുന്ന ആൾ" },
  "trusted.help": { en: "Someone to call before you pay anyone. Saved only on this device.", hi: "किसी को पैसे देने से पहले जिसे फ़ोन करें। सिर्फ़ इसी डिवाइस पर सेव होता है।", ml: "ആർക്കെങ്കിലും പണം നൽകും മുമ്പ് വിളിക്കേണ്ടയാൾ. ഈ ഉപകരണത്തിൽ മാത്രം സേവ് ചെയ്യുന്നു." },
  "trusted.name": { en: "Name", hi: "नाम", ml: "പേര്" },
  "trusted.phone": { en: "Phone number", hi: "फ़ोन नंबर", ml: "ഫോൺ നമ്പർ" },
  "trusted.save": { en: "Save", hi: "सेव करें", ml: "സേവ് ചെയ്യുക" },
  "trusted.edit": { en: "Change", hi: "बदलें", ml: "മാറ്റുക" },
  "trusted.add": { en: "Add someone to call", hi: "फ़ोन करने के लिए किसी को जोड़ें", ml: "വിളിക്കാൻ ഒരാളെ ചേർക്കുക" },
  "pause.title": { en: "Stop. Take one minute before you pay.", hi: "रुकिए। पैसे देने से पहले एक मिनट लीजिए।", ml: "നിൽക്കൂ. പണം നൽകും മുമ്പ് ഒരു മിനിറ്റ് എടുക്കൂ." },
  "pause.lead": { en: "Scammers rush you. Anyone genuine will wait one minute.", hi: "धोखेबाज़ जल्दी मचाते हैं। जो सच्चा है, वह एक मिनट रुक सकता है।", ml: "തട്ടിപ്പുകാർ തിടുക്കം കൂട്ടും. യഥാർത്ഥ ആളാണെങ്കിൽ ഒരു മിനിറ്റ് കാത്തിരിക്കും." },
  "pause.seconds": { en: "{n} seconds", hi: "{n} सेकंड", ml: "{n} സെക്കൻഡ്" },
  "pause.answer": { en: "Answer honestly. Only you see this.", hi: "ईमानदारी से जवाब दें। यह सिर्फ़ आप देख रहे हैं।", ml: "സത്യസന്ധമായി ഉത്തരം നൽകുക. ഇത് നിങ്ങൾ മാത്രമേ കാണൂ." },
  "pause.stop": { en: "Please don't pay. This is how scams work.", hi: "कृपया पैसे न दें। धोखाधड़ी ऐसे ही होती है।", ml: "ദയവായി പണം നൽകരുത്. തട്ടിപ്പുകൾ ഇങ്ങനെയാണ് നടക്കുന്നത്." },
  "pause.ok": { en: "Your answers don't match the usual scam pattern. If you're still unsure, ask someone you trust first.", hi: "आपके जवाब आम धोखाधड़ी जैसे नहीं लगते। फिर भी शक हो, तो पहले किसी भरोसेमंद व्यक्ति से पूछें।", ml: "നിങ്ങളുടെ ഉത്തരങ്ങൾ സാധാരണ തട്ടിപ്പ് പോലെയല്ല. എന്നിട്ടും സംശയമുണ്ടെങ്കിൽ ആദ്യം വിശ്വസിക്കുന്ന ഒരാളോട് ചോദിക്കുക." },
  "pause.done": { en: "Thank you for waiting.", hi: "रुकने के लिए धन्यवाद।", ml: "കാത്തിരുന്നതിന് നന്ദി." },
  "pause.close": { en: "I've checked. Close this.", hi: "मैंने जाँच ली है। इसे बंद करें।", ml: "ഞാൻ പരിശോധിച്ചു. ഇത് അടയ്ക്കുക." },
  "pause.link": { en: "About to pay someone? Take a 1-minute pause first", hi: "किसी को पैसे देने वाले हैं? पहले 1 मिनट रुकिए", ml: "ആർക്കെങ്കിലും പണം നൽകാൻ പോകുകയാണോ? ആദ്യം 1 മിനിറ്റ് നിൽക്കൂ" },

  // Practice
  "nav.practice": { en: "Practise", hi: "अभ्यास", ml: "പരിശീലനം" },
  "practice.title": { en: "Practise saying no", hi: "'ना' कहने का अभ्यास", ml: "'ഇല്ല' എന്ന് പറയാൻ പരിശീലിക്കാം" },
  "practice.lead": { en: "A short, safe practice call. Learn the tricks scammers use before a real one tries them on you.", hi: "एक छोटी, सुरक्षित अभ्यास कॉल। असली धोखेबाज़ से पहले ही उनकी चालें पहचानना सीखें।", ml: "ചെറുതും സുരക്ഷിതവുമായ ഒരു പരിശീലന കോൾ. യഥാർത്ഥ തട്ടിപ്പുകാരൻ വരും മുമ്പ് അവരുടെ തന്ത്രങ്ങൾ തിരിച്ചറിയാൻ പഠിക്കൂ." },
  "practice.note": { en: "This is practice. Nobody is really calling, and nothing is sent anywhere.", hi: "यह सिर्फ़ अभ्यास है। असल में कोई फ़ोन नहीं कर रहा, और कुछ भी कहीं नहीं भेजा जाता।", ml: "ഇത് പരിശീലനം മാത്രമാണ്. ശരിക്കും ആരും വിളിക്കുന്നില്ല, ഒന്നും എവിടേക്കും അയയ്ക്കുന്നില്ല." },
  "practice.back": { en: "All practice calls", hi: "सभी अभ्यास कॉल", ml: "എല്ലാ പരിശീലന കോളുകളും" },
  "practice.caller": { en: "Caller", hi: "कॉल करने वाला", ml: "വിളിക്കുന്നയാൾ" },
  "practice.you": { en: "You", hi: "आप", ml: "നിങ്ങൾ" },
  "practice.whatSay": { en: "What would you say?", hi: "आप क्या कहेंगे?", ml: "നിങ്ങൾ എന്ത് പറയും?" },
  "practice.good": { en: "Good answer.", hi: "अच्छा जवाब।", ml: "നല്ല മറുപടി." },
  "practice.careful": { en: "Careful: that's what they want.", hi: "सावधान: वे यही चाहते हैं।", ml: "ശ്രദ്ധിക്കുക: അവർ ആഗ്രഹിക്കുന്നത് ഇതാണ്." },
  "practice.trick": { en: "The trick", hi: "चाल", ml: "തന്ത്രം" },
  "practice.next": { en: "Next", hi: "आगे", ml: "അടുത്തത്" },
  "practice.score": { en: "You spotted {n} of {total} tricks", hi: "आपने {total} में से {n} चालें पहचानीं", ml: "{total} തന്ത്രങ്ങളിൽ {n} എണ്ണം നിങ്ങൾ തിരിച്ചറിഞ്ഞു" },
  "practice.remember": { en: "Remember:", hi: "याद रखें:", ml: "ഓർക്കുക:" },
  "practice.again": { en: "Try this one again", hi: "इसे फिर से करें", ml: "ഇത് വീണ്ടും ചെയ്യുക" },
  "practice.other": { en: "Choose another practice", hi: "दूसरा अभ्यास चुनें", ml: "മറ്റൊരു പരിശീലനം തിരഞ്ഞെടുക്കുക" },
  "practice.freeTitle": { en: "Free practice with the private AI", hi: "निजी AI के साथ खुला अभ्यास", ml: "സ്വകാര്യ AI-യോടൊപ്പം സ്വതന്ത്ര പരിശീലനം" },
  "practice.freeHelp": { en: "The private model on this device plays a scam caller, and you type your replies (in English). Nothing you type leaves this device.", hi: "इस डिवाइस का निजी मॉडल धोखेबाज़ बनकर बात करता है, और आप जवाब लिखते हैं (अंग्रेज़ी में)। आपका लिखा कुछ भी इस डिवाइस से बाहर नहीं जाता।", ml: "ഈ ഉപകരണത്തിലെ സ്വകാര്യ മോഡൽ ഒരു തട്ടിപ്പുകാരനായി സംസാരിക്കും, നിങ്ങൾ മറുപടി ടൈപ്പ് ചെയ്യും (ഇംഗ്ലീഷിൽ). നിങ്ങൾ ടൈപ്പ് ചെയ്യുന്നതൊന്നും ഈ ഉപകരണം വിട്ട് പോകില്ല." },
  "practice.freeStart": { en: "Start a free practice call", hi: "खुली अभ्यास कॉल शुरू करें", ml: "സ്വതന്ത്ര പരിശീലന കോൾ തുടങ്ങുക" },
  "practice.freeNeedsNano": { en: "Needs the private model on this device (see Set up).", hi: "इसके लिए इस डिवाइस पर निजी मॉडल चाहिए (सेट अप देखें)।", ml: "ഇതിന് ഈ ഉപകരണത്തിൽ സ്വകാര്യ മോഡൽ വേണം (സജ്ജമാക്കുക കാണുക)." },
  "practice.freePrivate": { en: "Played by the private model on this device. Nothing is sent anywhere.", hi: "इस डिवाइस का निजी मॉडल चला रहा है। कुछ भी कहीं नहीं भेजा जाता।", ml: "ഈ ഉപകരണത്തിലെ സ്വകാര്യ മോഡലാണ് ഇത് ചെയ്യുന്നത്. ഒന്നും എവിടേക്കും അയയ്ക്കുന്നില്ല." },
  "practice.freeError": { en: "The private model didn't answer. Try again, or use a guided practice call.", hi: "निजी मॉडल ने जवाब नहीं दिया। फिर कोशिश करें, या गाइड वाली अभ्यास कॉल चुनें।", ml: "സ്വകാര്യ മോഡൽ മറുപടി നൽകിയില്ല. വീണ്ടും ശ്രമിക്കുക, അല്ലെങ്കിൽ ഗൈഡഡ് പരിശീലന കോൾ ഉപയോഗിക്കുക." },
  "practice.freeWon": { en: "Well done. You said no firmly. That's exactly how to end a scam call.", hi: "शाबाश। आपने मज़बूती से 'ना' कहा। धोखेबाज़ की कॉल ऐसे ही ख़त्म करनी चाहिए।", ml: "നന്നായി. നിങ്ങൾ ഉറച്ച് 'ഇല്ല' എന്ന് പറഞ്ഞു. തട്ടിപ്പ് കോൾ അവസാനിപ്പിക്കേണ്ടത് ഇങ്ങനെയാണ്." },
  "practice.freeOver": { en: "Practice over. Next time, try ending the call: \"I'm hanging up and calling my son.\"", hi: "अभ्यास ख़त्म। अगली बार कॉल ख़त्म करके देखें: \"मैं फ़ोन काट रहा हूँ और अपने बेटे को फ़ोन कर रहा हूँ।\"", ml: "പരിശീലനം കഴിഞ്ഞു. അടുത്ത തവണ കോൾ അവസാനിപ്പിച്ച് നോക്കൂ: \"ഞാൻ ഫോൺ കട്ട് ചെയ്ത് മകനെ വിളിക്കുന്നു.\"" },
  "practice.tricksHere": { en: "Tricks in this message:", hi: "इस संदेश में चालें:", ml: "ഈ സന്ദേശത്തിലെ തന്ത്രങ്ങൾ:" },
  "practice.typing": { en: "The caller is typing…", hi: "कॉल करने वाला लिख रहा है…", ml: "വിളിക്കുന്നയാൾ ടൈപ്പ് ചെയ്യുന്നു…" },
  "practice.yourReply": { en: "Your reply", hi: "आपका जवाब", ml: "നിങ്ങളുടെ മറുപടി" },
  "practice.send": { en: "Send", hi: "भेजें", ml: "അയയ്ക്കുക" },
  "practice.banner": { en: "🎓 Practise spotting a scam, safely", hi: "🎓 धोखाधड़ी पहचानने का सुरक्षित अभ्यास करें", ml: "🎓 തട്ടിപ്പ് തിരിച്ചറിയാൻ സുരക്ഷിതമായി പരിശീലിക്കാം" },

  // Scam radar
  "radar.title": { en: "Scam radar", hi: "स्कैम रडार", ml: "തട്ടിപ്പ് റഡാർ" },
  "radar.lead": { en: "Which scams people are reporting this week, so you know what to watch out for.", hi: "इस हफ़्ते लोग किन धोखाधड़ियों की ख़बर दे रहे हैं, ताकि आप सावधान रहें।", ml: "ഈ ആഴ്ച ആളുകൾ ഏതൊക്കെ തട്ടിപ്പുകളാണ് റിപ്പോർട്ട് ചെയ്യുന്നത്, നിങ്ങൾ ശ്രദ്ധിക്കാൻ." },
  "radar.private": { en: "Only the type of scam, the week and the state are shared. Never anyone's messages or names.", hi: "सिर्फ़ धोखाधड़ी का प्रकार, हफ़्ता और राज्य साझा होता है। किसी के संदेश या नाम कभी नहीं।", ml: "തട്ടിപ്പിന്റെ തരം, ആഴ്ച, സംസ്ഥാനം എന്നിവ മാത്രമേ പങ്കിടൂ. ആരുടെയും സന്ദേശങ്ങളോ പേരുകളോ ഒരിക്കലും ഇല്ല." },
  "radar.region": { en: "Show reports for", hi: "किसकी रिपोर्ट देखें", ml: "ഏത് സ്ഥലത്തെ റിപ്പോർട്ടുകൾ കാണണം" },
  "radar.allIndia": { en: "All of India", hi: "पूरा भारत", ml: "ഇന്ത്യ മുഴുവൻ" },
  "radar.loading": { en: "Loading…", hi: "लोड हो रहा है…", ml: "ലോഡ് ചെയ്യുന്നു…" },
  "radar.loadError": { en: "The radar couldn't be loaded right now.", hi: "रडार अभी लोड नहीं हो सका।", ml: "റഡാർ ഇപ്പോൾ ലോഡ് ചെയ്യാനായില്ല." },
  "radar.offline": { en: "The scam radar needs the internet and the online part of SecondLook.", hi: "स्कैम रडार के लिए इंटरनेट और SecondLook का ऑनलाइन हिस्सा चाहिए।", ml: "തട്ടിപ്പ് റഡാറിന് ഇന്റർനെറ്റും SecondLook-ന്റെ ഓൺലൈൻ ഭാഗവും വേണം." },
  "radar.empty": { en: "No reports yet this week.", hi: "इस हफ़्ते अभी तक कोई रिपोर्ट नहीं।", ml: "ഈ ആഴ്ച ഇതുവരെ റിപ്പോർട്ടുകളൊന്നുമില്ല." },
  "radar.reports": { en: "{n} this week", hi: "इस हफ़्ते {n}", ml: "ഈ ആഴ്ച {n}" },
  "radar.lastWeek": { en: "Last week: {n}", hi: "पिछले हफ़्ते: {n}", ml: "കഴിഞ്ഞ ആഴ്ച: {n}" },
  "radar.inRegion": { en: "{n} in {region}", hi: "{region} में {n}", ml: "{region}-ൽ {n}" },
  "radar.howTitle": { en: "How the radar works", hi: "रडार कैसे काम करता है", ml: "റഡാർ എങ്ങനെ പ്രവർത്തിക്കുന്നു" },
  "radar.how": { en: "When SecondLook finds a scam, you can tap \"Add to the scam radar\". Your device works out the type of scam and adds 1 to this week's count for your state. The message itself never leaves your device for this.", hi: "जब SecondLook किसी धोखाधड़ी को पकड़ता है, तो आप \"स्कैम रडार में जोड़ें\" दबा सकते हैं। आपका डिवाइस धोखाधड़ी का प्रकार तय करता है और आपके राज्य की इस हफ़्ते की गिनती में 1 जोड़ता है। इसके लिए संदेश कभी आपके डिवाइस से बाहर नहीं जाता।", ml: "SecondLook ഒരു തട്ടിപ്പ് കണ്ടെത്തുമ്പോൾ \"തട്ടിപ്പ് റഡാറിൽ ചേർക്കുക\" അമർത്താം. നിങ്ങളുടെ ഉപകരണം തട്ടിപ്പിന്റെ തരം കണ്ടെത്തി, നിങ്ങളുടെ സംസ്ഥാനത്തിന്റെ ഈ ആഴ്ചത്തെ എണ്ണത്തിൽ 1 ചേർക്കും. ഇതിനായി സന്ദേശം ഒരിക്കലും ഉപകരണം വിട്ട് പോകില്ല." },
  "radar.disclaimer": { en: "These are counts from SecondLook users, not official figures. To report a scam to the police, call 1930 or visit cybercrime.gov.in.", hi: "ये SecondLook इस्तेमाल करने वालों की गिनती है, सरकारी आँकड़े नहीं। पुलिस को शिकायत के लिए 1930 पर कॉल करें या cybercrime.gov.in पर जाएँ।", ml: "ഇവ SecondLook ഉപയോക്താക്കളുടെ എണ്ണമാണ്, ഔദ്യോഗിക കണക്കുകളല്ല. പോലീസിൽ പരാതിപ്പെടാൻ 1930-ൽ വിളിക്കുക, അല്ലെങ്കിൽ cybercrime.gov.in സന്ദർശിക്കുക." },
  "radar.add": { en: "Add to the scam radar (warn others)", hi: "स्कैम रडार में जोड़ें (दूसरों को सावधान करें)", ml: "തട്ടിപ്പ് റഡാറിൽ ചേർക്കുക (മറ്റുള്ളവർക്ക് മുന്നറിയിപ്പ്)" },
  "radar.addNote": { en: "Shares only \"{type}\", this week and your state. Not the message.", hi: "सिर्फ़ \"{type}\", यह हफ़्ता और आपका राज्य साझा होगा। संदेश नहीं।", ml: "\"{type}\", ഈ ആഴ്ച, നിങ്ങളുടെ സംസ്ഥാനം എന്നിവ മാത്രം പങ്കിടും. സന്ദേശം ഇല്ല." },
  "radar.added": { en: "Added. Thank you for warning others.", hi: "जोड़ दिया गया। दूसरों को सावधान करने के लिए धन्यवाद।", ml: "ചേർത്തു. മറ്റുള്ളവർക്ക് മുന്നറിയിപ്പ് നൽകിയതിന് നന്ദി." },
  "radar.see": { en: "See the radar", hi: "रडार देखें", ml: "റഡാർ കാണുക" },
  "radar.error": { en: "Couldn't add it right now.", hi: "अभी जोड़ा नहीं जा सका।", ml: "ഇപ്പോൾ ചേർക്കാനായില്ല." },
  "radar.teaser": { en: "Most reported this week: {type} ({n})", hi: "इस हफ़्ते सबसे ज़्यादा रिपोर्ट: {type} ({n})", ml: "ഈ ആഴ്ച ഏറ്റവും കൂടുതൽ റിപ്പോർട്ട് ചെയ്തത്: {type} ({n})" },
  "radar.link": { en: "📡 See which scams are going around this week", hi: "📡 देखें इस हफ़्ते कौन-सी धोखाधड़ी चल रही है", ml: "📡 ഈ ആഴ്ച ഏതൊക്കെ തട്ടിപ്പുകൾ നടക്കുന്നുവെന്ന് കാണുക" },
  "radar.settingsTitle": { en: "Your state, for the scam radar", hi: "स्कैम रडार के लिए आपका राज्य", ml: "തട്ടിപ്പ് റഡാറിനായി നിങ്ങളുടെ സംസ്ഥാനം" },
  "radar.settingsHelp": { en: "Only used when you tap \"Add to the scam radar\". Saved on this device.", hi: "सिर्फ़ तब इस्तेमाल होता है जब आप \"स्कैम रडार में जोड़ें\" दबाते हैं। इसी डिवाइस पर सेव होता है।", ml: "\"തട്ടിപ്പ് റഡാറിൽ ചേർക്കുക\" അമർത്തുമ്പോൾ മാത്രം ഉപയോഗിക്കും. ഈ ഉപകരണത്തിൽ സേവ് ചെയ്യുന്നു." },
} satisfies Record<string, Entry>;

export type Key = keyof typeof D;

export function translate(lang: UiLang, key: Key, vars: Record<string, string | number> = {}): string {
  const s = D[key][lang] || D[key].en;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

// ---- Content that comes from the shared rules engine ----

const SIGNAL_TEXT: Record<SignalId, { hi: [string, string]; ml: [string, string] }> = {
  authority: { hi: ["अधिकारी होने का दावा", "पुलिस, अदालत, बैंक या टैक्स विभाग कभी चैट या कॉल पर पैसे या कोड नहीं माँगते।"], ml: ["ഉദ്യോഗസ്ഥനാണെന്ന് അവകാശപ്പെടുന്നു", "പോലീസ്, കോടതി, ബാങ്ക്, നികുതി വകുപ്പ് എന്നിവ ചാറ്റിലോ കോളിലോ പണമോ കോഡോ ചോദിക്കില്ല."] },
  urgency: { hi: ["जल्दी करने का दबाव", "धोखेबाज़ जल्दी मचाते हैं ताकि आप रुककर जाँच न करें।"], ml: ["തിടുക്കം കൂട്ടുന്നു", "നിങ്ങൾ നിന്ന് ആലോചിക്കാതിരിക്കാനാണ് തട്ടിപ്പുകാർ തിടുക്കം കൂട്ടുന്നത്."] },
  secrecy: { hi: ["बात छिपाने को कहना", "किसी को न बताने को कहना इसलिए होता है ताकि कोई आपको चेतावनी न दे सके।"], ml: ["രഹസ്യമാക്കാൻ പറയുന്നു", "ആരോടും പറയരുതെന്ന് പറയുന്നത് മറ്റുള്ളവർ നിങ്ങൾക്ക് മുന്നറിയിപ്പ് തരാതിരിക്കാനാണ്."] },
  money_request: { hi: ["पैसे की माँग", "जिसे आप पहचान नहीं सकते, उसके पैसे माँगने पर रुककर सोचें।"], ml: ["പണം ആവശ്യപ്പെടുന്നു", "ഉറപ്പില്ലാത്ത ഒരാൾ പണം ചോദിച്ചാൽ ഒന്ന് നിന്ന് ആലോചിക്കുക."] },
  credentials: { hi: ["कोड या पासवर्ड माँगना", "कोई भी असली संस्था आपका OTP, PIN या पासवर्ड नहीं माँगती।"], ml: ["കോഡോ പാസ്‌വേഡോ ചോദിക്കുന്നു", "യഥാർത്ഥ സ്ഥാപനങ്ങൾ ഒരിക്കലും നിങ്ങളുടെ OTP, PIN, പാസ്‌വേഡ് ചോദിക്കില്ല."] },
  link: { hi: ["संदिग्ध लिंक", "अनचाहे संदेशों के लिंक अक्सर नकली पेजों पर ले जाते हैं।"], ml: ["സംശയാസ്പദമായ ലിങ്ക്", "അപ്രതീക്ഷിത സന്ദേശങ്ങളിലെ ലിങ്കുകൾ പലപ്പോഴും വ്യാജ പേജുകളിലേക്കാണ്."] },
  romance: { hi: ["प्यार और पैसे", "ऑनलाइन मिले साथी का पैसे माँगना आम धोखा है।"], ml: ["പ്രണയവും പണവും", "ഓൺലൈനിൽ പരിചയപ്പെട്ടയാൾ പണം ചോദിക്കുന്നത് സാധാരണ തട്ടിപ്പാണ്."] },
  prize: { hi: ["इनाम या बहुत अच्छा ऑफ़र", "असली इनाम के लिए फ़ीस नहीं लगती।"], ml: ["സമ്മാനം അല്ലെങ്കിൽ അമിതമായ ഓഫർ", "യഥാർത്ഥ സമ്മാനത്തിന് ഫീസ് വേണ്ട."] },
  job: { hi: ["आसान कमाई वाली नौकरी", "आसान काम के लिए ज़्यादा पैसे और फिर पहले पैसे माँगना, यह जाल है।"], ml: ["എളുപ്പ വരുമാനമുള്ള ജോലി", "ലളിതമായ ജോലിക്ക് വലിയ പ്രതിഫലവും പിന്നെ മുൻകൂർ പണവും ആവശ്യപ്പെടുന്നത് ഒരു കെണിയാണ്."] },
  overpayment: { hi: ["ज़्यादा पैसे लौटाने की चाल", "'ग़लती से ज़्यादा भेजे' पैसे लौटाने को कहना पुराना धोखा है।"], ml: ["അധികം അയച്ച പണം തിരികെ ചോദിക്കുന്ന തന്ത്രം", "'അബദ്ധത്തിൽ അധികം അയച്ച' പണം തിരികെ ചോദിക്കുന്നത് പഴയ തട്ടിപ്പാണ്."] },
  off_platform: { hi: ["दूसरे ऐप पर ले जाना", "WhatsApp, Telegram या वीडियो कॉल पर ले जाने से सुरक्षा हट जाती है।"], ml: ["മറ്റൊരു ആപ്പിലേക്ക് കൊണ്ടുപോകുന്നു", "WhatsApp, Telegram, വീഡിയോ കോൾ എന്നിവയിലേക്ക് മാറ്റുന്നത് സംരക്ഷണം ഇല്ലാതാക്കും."] },
};

/** Signal label + why in the UI language (English keeps the rule's own wording). */
export function signalText(s: VerdictSignal, lang: UiLang): { label: string; why?: string } {
  if (lang === "en") return { label: s.label ?? s.id, why: s.why };
  const [label, why] = SIGNAL_TEXT[s.id][lang];
  return { label, why };
}

// The rules engine's fixed advice strings, by exact English text.
const ADVICE: Record<string, { hi: string; ml: string }> = {
  "Hang up now. Real police never arrest anyone on a video call. Call a family member, and report it at cybercrime.gov.in or 1930.": {
    hi: "फ़ोन तुरंत काट दें। असली पुलिस कभी वीडियो कॉल पर किसी को गिरफ़्तार नहीं करती। परिवार के किसी सदस्य को फ़ोन करें और cybercrime.gov.in या 1930 पर शिकायत करें।",
    ml: "ഉടൻ ഫോൺ കട്ട് ചെയ്യുക. യഥാർത്ഥ പോലീസ് ഒരിക്കലും വീഡിയോ കോളിൽ ആരെയും അറസ്റ്റ് ചെയ്യില്ല. കുടുംബത്തിലെ ഒരാളെ വിളിക്കുക, cybercrime.gov.in-ലോ 1930-ലോ പരാതിപ്പെടുക.",
  },
  "Don't share any code, PIN or password. Stop replying and call your bank on the number on your card.": {
    hi: "कोई कोड, PIN या पासवर्ड न बताएँ। जवाब देना बंद करें और अपने कार्ड पर लिखे नंबर पर बैंक को फ़ोन करें।",
    ml: "ഒരു കോഡും PIN-ഉം പാസ്‌വേഡും പങ്കിടരുത്. മറുപടി നിർത്തി, കാർഡിലുള്ള നമ്പറിൽ ബാങ്കിനെ വിളിക്കുക.",
  },
  "Don't send money, share codes or click links. Check with the person or company on a number you already know, and tell someone you trust.": {
    hi: "पैसे न भेजें, कोड न बताएँ और लिंक न खोलें। उस व्यक्ति या कंपनी से उस नंबर पर बात करें जो आपको पहले से पता है, और किसी भरोसेमंद व्यक्ति को बताएँ।",
    ml: "പണം അയയ്ക്കരുത്, കോഡ് പങ്കിടരുത്, ലിങ്ക് തുറക്കരുത്. നിങ്ങൾക്ക് നേരത്തെ അറിയാവുന്ന നമ്പറിൽ ആ വ്യക്തിയോടോ സ്ഥാപനത്തോടോ ഉറപ്പാക്കുക, വിശ്വസിക്കുന്ന ഒരാളോട് പറയുക.",
  },
  "Be careful. Don't pay or share any codes until you've checked directly, using a number you find yourself.": {
    hi: "सावधान रहें। खुद ढूँढे गए नंबर पर सीधे पुष्टि करने से पहले न पैसे भेजें, न कोई कोड बताएँ।",
    ml: "ശ്രദ്ധിക്കുക. നിങ്ങൾ തന്നെ കണ്ടെത്തിയ നമ്പറിൽ നേരിട്ട് ഉറപ്പാക്കുന്നതുവരെ പണം അയയ്ക്കുകയോ കോഡ് പങ്കിടുകയോ ചെയ്യരുത്.",
  },
  "No strong scam signals found. If anything still feels off, ask someone you trust before you pay.": {
    hi: "धोखाधड़ी के कोई बड़े संकेत नहीं मिले। फिर भी कुछ अजीब लगे तो पैसे देने से पहले किसी भरोसेमंद व्यक्ति से पूछें।",
    ml: "തട്ടിപ്പിന്റെ വലിയ സൂചനകളൊന്നും കണ്ടില്ല. എന്നിട്ടും എന്തെങ്കിലും പന്തികേട് തോന്നിയാൽ, പണം നൽകും മുമ്പ് വിശ്വസിക്കുന്ന ഒരാളോട് ചോദിക്കുക.",
  },
  "Copy and paste the message text instead, or ask someone you trust to look at it.": {
    hi: "इसकी जगह संदेश का टेक्स्ट कॉपी करके चिपकाएँ, या किसी भरोसेमंद व्यक्ति को दिखाएँ।",
    ml: "പകരം സന്ദേശത്തിന്റെ ടെക്സ്റ്റ് പകർത്തി ഒട്ടിക്കുക, അല്ലെങ്കിൽ വിശ്വസിക്കുന്ന ഒരാളെ കാണിക്കുക.",
  },
};

/** Translate the engine's fixed advice; AI-written advice is shown as written. */
export function adviceText(advice: string, lang: UiLang): string {
  if (lang === "en") return advice;
  return ADVICE[advice]?.[lang] ?? advice;
}

/** Rules-only explanation rebuilt in the UI language from level + signals. */
export function rulesExplanation(level: Level, signals: VerdictSignal[], lang: UiLang): string {
  if (signals.length === 0) return translate(lang, "result.rulesNone");
  const labels = [...new Set(signals.map((s) => signalText(s, lang).label))].slice(0, 3);
  const lead = translate(lang, level === "high" ? "result.rulesLeadHigh" : level === "medium" ? "result.rulesLeadMedium" : "result.rulesLeadLow");
  return `${lead} ${translate(lang, "result.rulesFound", { list: labels.join(", ") })}`;
}

const REDACTION_NOUNS: Record<RedactionType, Record<Exclude<UiLang, "en">, string>> = {
  PHONE: { hi: "फ़ोन नंबर", ml: "ഫോൺ നമ്പർ" },
  EMAIL: { hi: "ईमेल", ml: "ഇമെയിൽ" },
  UPI: { hi: "UPI ID", ml: "UPI ID" },
  CARD: { hi: "कार्ड नंबर", ml: "കാർഡ് നമ്പർ" },
  IBAN: { hi: "IBAN", ml: "IBAN" },
  ACCOUNT: { hi: "खाता नंबर", ml: "അക്കൗണ്ട് നമ്പർ" },
  OTP: { hi: "कोड", ml: "കോഡ്" },
  AADHAAR: { hi: "आधार नंबर", ml: "ആധാർ നമ്പർ" },
  PAN: { hi: "PAN", ml: "PAN" },
  NAME: { hi: "नाम", ml: "പേര്" },
};

/** "3 phone numbers, 1 account number" in the UI language ("फ़ोन नंबर: 3, खाता नंबर: 1"). */
export function redactionsText(r: Redaction[], lang: UiLang, english: (r: Redaction[]) => string): string {
  if (lang === "en") return english(r);
  return r.filter((x) => x.count > 0).map((x) => `${REDACTION_NOUNS[x.type][lang]}: ${x.count}`).join(", ");
}

// ---- Router reasons (by code) and fallback notes (by exact English text) ----


type Loc = { hi: string; ml: string };
const LANG_NAMES: Record<string, Loc> = {
  Hindi: { hi: "हिंदी", ml: "ഹിന്ദി" },
  Malayalam: { hi: "मलयालम", ml: "മലയാളം" },
  "this language": { hi: "इस भाषा", ml: "ഈ ഭാഷ" },
};

const REASONS: Record<RouteDecision["code"], Loc> = {
  device_default: { hi: "इसी डिवाइस पर जाँचा गया। कुछ भी कहीं नहीं भेजा गया।", ml: "ഈ ഉപകരണത്തിൽ തന്നെ പരിശോധിച്ചു. ഒന്നും എവിടേക്കും അയച്ചില്ല." },
  device_chunked: { hi: "लंबा संदेश: इसी डिवाइस पर {n} हिस्सों में जाँचा गया। कुछ भी नहीं भेजा गया।", ml: "നീണ്ട സന്ദേശം: ഈ ഉപകരണത്തിൽ {n} ഭാഗങ്ങളായി പരിശോധിച്ചു. ഒന്നും അയച്ചില്ല." },
  device_forced_lang: { hi: "इसी डिवाइस पर जाँचा गया। यह मॉडल {lang} के लिए परखा नहीं गया है, इसलिए नतीजा कम सटीक हो सकता है।", ml: "ഈ ഉപകരണത്തിൽ പരിശോധിച്ചു. ഈ മോഡൽ {lang}-ക്ക് പരീക്ഷിച്ചിട്ടില്ല, അതിനാൽ ഫലം കൃത്യത കുറഞ്ഞതാകാം." },
  device_forced_long: { hi: "बहुत लंबा संदेश: क्लाउड इस्तेमाल नहीं हो रहा, इसलिए पहले हिस्से इसी डिवाइस पर जाँचे गए।", ml: "വളരെ നീണ്ട സന്ദേശം: ക്ലൗഡ് ഉപയോഗിക്കാത്തതിനാൽ ആദ്യ ഭാഗങ്ങൾ മാത്രം ഈ ഉപകരണത്തിൽ പരിശോധിച്ചു." },
  device_forced_followup: { hi: "क्लाउड इस्तेमाल नहीं हो रहा, इसलिए इसी डिवाइस पर नए सवाल की तरह जवाब दिया गया।", ml: "ക്ലൗഡ് ഉപയോഗിക്കാത്തതിനാൽ ഈ ഉപകരണത്തിൽ ഒരു പുതിയ ചോദ്യമായി മറുപടി നൽകി." },
  cloud_no_nano: { hi: "इस डिवाइस पर निजी AI मॉडल नहीं है, इसलिए निजी जानकारी हटाकर जाँच क्लाउड में हुई।", ml: "ഈ ഉപകരണത്തിൽ സ്വകാര്യ AI മോഡൽ ഇല്ല, അതിനാൽ വ്യക്തിഗത വിവരങ്ങൾ നീക്കി ക്ലൗഡിൽ പരിശോധിച്ചു." },
  cloud_lang: { hi: "निजी मॉडल अभी {lang} के लिए परखा नहीं गया है, इसलिए निजी जानकारी हटाकर जाँच क्लाउड में हुई।", ml: "സ്വകാര്യ മോഡൽ ഇതുവരെ {lang}-ക്ക് പരീക്ഷിച്ചിട്ടില്ല, അതിനാൽ വ്യക്തിഗത വിവരങ്ങൾ നീക്കി ക്ലൗഡിൽ പരിശോധിച്ചു." },
  cloud_too_long: { hi: "यह निजी मॉडल के लिए बहुत लंबा है, इसलिए निजी जानकारी हटाकर जाँच क्लाउड में हुई।", ml: "ഇത് സ്വകാര്യ മോഡലിന് വളരെ നീണ്ടതാണ്, അതിനാൽ വ്യക്തിഗത വിവരങ്ങൾ നീക്കി ക്ലൗഡിൽ പരിശോധിച്ചു." },
  cloud_followup: { hi: "आगे के सवालों के लिए क्लाउड मॉडल चाहिए (निजी मॉडल एक बार में एक ही सवाल लेता है)। पहले निजी जानकारी हटाई गई।", ml: "തുടർചോദ്യങ്ങൾക്ക് ക്ലൗഡ് മോഡൽ വേണം (സ്വകാര്യ മോഡൽ ഒരു സമയം ഒരു ചോദ്യം മാത്രം). ആദ്യം വ്യക്തിഗത വിവരങ്ങൾ നീക്കി." },
  rules_offline: { hi: "आप ऑफ़लाइन हैं और इस डिवाइस पर निजी AI मॉडल नहीं है, इसलिए त्वरित जाँच की गई।", ml: "നിങ്ങൾ ഓഫ്‌ലൈനാണ്, ഈ ഉപകരണത്തിൽ സ്വകാര്യ AI മോഡലും ഇല്ല, അതിനാൽ പെട്ടെന്നുള്ള പരിശോധന നടത്തി." },
  rules_never_cloud: { hi: "आपने क्लाउड बंद रखा है और इस डिवाइस पर निजी AI मॉडल नहीं है, इसलिए त्वरित जाँच की गई।", ml: "നിങ്ങൾ ക്ലൗഡ് ഓഫാക്കിയിട്ടുണ്ട്, ഈ ഉപകരണത്തിൽ സ്വകാര്യ AI മോഡലും ഇല്ല, അതിനാൽ പെട്ടെന്നുള്ള പരിശോധന നടത്തി." },
  rules_cloud_off: { hi: "क्लाउड जाँच अभी उपलब्ध नहीं है और इस डिवाइस पर निजी AI मॉडल नहीं है, इसलिए त्वरित जाँच की गई।", ml: "ക്ലൗഡ് പരിശോധന ഇപ്പോൾ ലഭ്യമല്ല, ഈ ഉപകരണത്തിൽ സ്വകാര്യ AI മോഡലും ഇല്ല, അതിനാൽ പെട്ടെന്നുള്ള പരിശോധന നടത്തി." },
};

const NOTES: Record<string, Loc> = {
  "The cloud didn't answer, so we checked on this device instead.": { hi: "क्लाउड से जवाब नहीं आया, इसलिए इसी डिवाइस पर जाँचा गया।", ml: "ക്ലൗഡിൽ നിന്ന് മറുപടി കിട്ടിയില്ല, അതിനാൽ ഈ ഉപകരണത്തിൽ പരിശോധിച്ചു." },
  "The AI check didn't answer, so we ran a quick check.": { hi: "AI जाँच से जवाब नहीं आया, इसलिए त्वरित जाँच की गई।", ml: "AI പരിശോധനയിൽ നിന്ന് മറുപടി കിട്ടിയില്ല, അതിനാൽ പെട്ടെന്നുള്ള പരിശോധന നടത്തി." },
  "The on-device model didn't answer, so we used the cloud with personal details removed.": { hi: "डिवाइस के मॉडल से जवाब नहीं आया, इसलिए निजी जानकारी हटाकर क्लाउड इस्तेमाल किया गया।", ml: "ഉപകരണത്തിലെ മോഡൽ മറുപടി നൽകിയില്ല, അതിനാൽ വ്യക്തിഗത വിവരങ്ങൾ നീക്കി ക്ലൗഡ് ഉപയോഗിച്ചു." },
  "The on-device model didn't answer, so we ran a quick check.": { hi: "डिवाइस के मॉडल से जवाब नहीं आया, इसलिए त्वरित जाँच की गई।", ml: "ഉപകരണത്തിലെ മോഡൽ മറുപടി നൽകിയില്ല, അതിനാൽ പെട്ടെന്നുള്ള പരിശോധന നടത്തി." },
  "The screenshot stayed on your device, so we ran a quick check on any text instead.": { hi: "स्क्रीनशॉट आपके डिवाइस पर ही रहा, इसलिए लिखे हुए टेक्स्ट की त्वरित जाँच की गई।", ml: "സ്ക്രീൻഷോട്ട് നിങ്ങളുടെ ഉപകരണത്തിൽ തന്നെ നിന്നു, അതിനാൽ ടെക്സ്റ്റ് മാത്രം പെട്ടെന്ന് പരിശോധിച്ചു." },
  "The cloud model isn't set up, so we ran a quick check.": { hi: "क्लाउड मॉडल सेट नहीं है, इसलिए त्वरित जाँच की गई।", ml: "ക്ലൗഡ് മോഡൽ സജ്ജമാക്കിയിട്ടില്ല, അതിനാൽ പെട്ടെന്നുള്ള പരിശോധന നടത്തി." },
  "The cloud's answer couldn't be read, so this result is from the quick check. Personal details were removed before anything was sent.": { hi: "क्लाउड का जवाब पढ़ा नहीं जा सका, इसलिए यह त्वरित जाँच का नतीजा है। भेजने से पहले निजी जानकारी हटा दी गई थी।", ml: "ക്ലൗഡിന്റെ മറുപടി വായിക്കാനായില്ല, അതിനാൽ ഇത് പെട്ടെന്നുള്ള പരിശോധനയുടെ ഫലമാണ്. അയയ്ക്കുന്നതിന് മുമ്പ് വ്യക്തിഗത വിവരങ്ങൾ നീക്കിയിരുന്നു." },
  "The private model couldn't answer this time, so personal details were removed and the check ran in the cloud.": { hi: "इस बार निजी मॉडल जवाब नहीं दे पाया, इसलिए निजी जानकारी हटाकर जाँच क्लाउड में हुई।", ml: "ഇത്തവണ സ്വകാര്യ മോഡലിന് മറുപടി നൽകാനായില്ല, അതിനാൽ വ്യക്തിഗത വിവരങ്ങൾ നീക്കി ക്ലൗഡിൽ പരിശോധിച്ചു." },
  "The AI didn't answer, so here is our standard advice.": { hi: "AI से जवाब नहीं आया, इसलिए यह हमारी सामान्य सलाह है।", ml: "AI മറുപടി നൽകിയില്ല, അതിനാൽ ഇതാണ് ഞങ്ങളുടെ സാധാരണ ഉപദേശം." },
  "AI isn't available right now, so here is our standard advice.": { hi: "AI अभी उपलब्ध नहीं है, इसलिए यह हमारी सामान्य सलाह है।", ml: "AI ഇപ്പോൾ ലഭ്യമല്ല, അതിനാൽ ഇതാണ് ഞങ്ങളുടെ സാധാരണ ഉപദേശം." },
  "Don't reply, pay, or share any code. If you already paid or shared a code, call your bank now using the number on your card, and report it (in India: call 1930 or visit cybercrime.gov.in). Then tell someone you trust.": {
    hi: "जवाब न दें, पैसे न भेजें, कोई कोड न बताएँ। अगर पैसे भेज दिए या कोड बता दिया है, तो अभी अपने कार्ड पर लिखे नंबर पर बैंक को फ़ोन करें और शिकायत करें (भारत में: 1930 पर कॉल करें या cybercrime.gov.in पर जाएँ)। फिर किसी भरोसेमंद व्यक्ति को बताएँ।",
    ml: "മറുപടി നൽകരുത്, പണം അയയ്ക്കരുത്, കോഡ് പങ്കിടരുത്. ഇതിനകം പണം അയയ്ക്കുകയോ കോഡ് പങ്കിടുകയോ ചെയ്തെങ്കിൽ, ഇപ്പോൾ തന്നെ കാർഡിലുള്ള നമ്പറിൽ ബാങ്കിനെ വിളിച്ച് പരാതിപ്പെടുക (ഇന്ത്യയിൽ: 1930-ൽ വിളിക്കുക അല്ലെങ്കിൽ cybercrime.gov.in സന്ദർശിക്കുക). പിന്നെ വിശ്വസിക്കുന്ന ഒരാളോട് പറയുക.",
  },
};

/** The router's reason in the UI language. */
export function reasonText(d: RouteDecision, lang: UiLang): string {
  if (lang === "en") return d.reason;
  const tpl = REASONS[d.code]?.[lang];
  if (!tpl) return d.reason;
  const langName = /for (Hindi|Malayalam|this language)/.exec(d.reason)?.[1] ?? "this language";
  return tpl.replace("{n}", String(d.chunks)).replace("{lang}", LANG_NAMES[langName]?.[lang] ?? langName);
}

/** Fallback notes and canned answers in the UI language (unknown text is shown as is). */
export function noteText(note: string, lang: UiLang): string {
  if (lang === "en") return note;
  return NOTES[note]?.[lang] ?? note;
}

// ---- Call Guard ----
// Questions by CALL_QUESTIONS id; warnings by the first rule id of each CALL_WARNINGS entry.
const CALL_Q: Record<string, Loc> = {
  oncall: { hi: "क्या कोई फ़ोन या वीडियो कॉल पर आपसे यह पैसे भेजने को कह रहा है?", ml: "ഫോണിലോ വീഡിയോ കോളിലോ ആരെങ്കിലും ഈ പണം അയയ്ക്കാൻ നിങ്ങളോട് പറയുന്നുണ്ടോ?" },
  authority: { hi: "क्या वे खुद को पुलिस, सीबीआई, कस्टम, अदालत या आपके बैंक से बता रहे हैं?", ml: "അവർ പോലീസ്, സിബിഐ, കസ്റ്റംസ്, കോടതി, അല്ലെങ്കിൽ നിങ്ങളുടെ ബാങ്കിൽ നിന്നാണെന്ന് പറയുന്നുണ്ടോ?" },
  arrest: { hi: "क्या वे कह रहे हैं कि आप गिरफ़्तार हैं, या आपको वीडियो कॉल पर ही रहना होगा?", ml: "നിങ്ങൾ അറസ്റ്റിലാണെന്നോ വീഡിയോ കോളിൽ തന്നെ തുടരണമെന്നോ അവർ പറയുന്നുണ്ടോ?" },
  secret: { hi: "क्या उन्होंने कहा कि परिवार को न बताएँ, या फ़ोन न काटें?", ml: "കുടുംബത്തോട് പറയരുതെന്നോ ഫോൺ കട്ട് ചെയ്യരുതെന്നോ അവർ പറഞ്ഞോ?" },
  money: { hi: "क्या वे पैसे भेजने, या उन्हें किसी 'सुरक्षित' खाते में डालने को कह रहे हैं?", ml: "പണം അയയ്ക്കാനോ ഒരു 'സുരക്ഷിത' അക്കൗണ്ടിലേക്ക് മാറ്റാനോ അവർ ആവശ്യപ്പെടുന്നുണ്ടോ?" },
  code: { hi: "क्या वे OTP, PIN या पासवर्ड माँग रहे हैं, या कोई ऐप डालने को कह रहे हैं?", ml: "അവർ OTP, PIN, പാസ്‌വേഡ് ചോദിക്കുന്നുണ്ടോ, അല്ലെങ്കിൽ ഒരു ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യാൻ പറയുന്നുണ്ടോ?" },
  rush: { hi: "क्या वे जल्दी मचा रहे हैं, या अभी न करने पर कुछ बुरा होने की धमकी दे रहे हैं?", ml: "അവർ തിടുക്കം കൂട്ടുന്നുണ്ടോ, അല്ലെങ്കിൽ ഇപ്പോൾ ചെയ്തില്ലെങ്കിൽ എന്തെങ്കിലും ദോഷം വരുമെന്ന് ഭീഷണിപ്പെടുത്തുന്നുണ്ടോ?" },
};

const CALL_W: Record<string, Loc> = {
  call_pressure: { hi: "फ़ोन पर कोई आपसे पैसे भेजने को कह रहा है। ज़्यादातर धोखाधड़ी ऐसे ही होती है। पहले फ़ोन काटें, फिर सोचें।", ml: "ഫോണിൽ ആരോ പണം അയയ്ക്കാൻ പറയുന്നു. മിക്ക തട്ടിപ്പുകളും ഇങ്ങനെയാണ്. ആദ്യം ഫോൺ കട്ട് ചെയ്യുക, പിന്നെ തീരുമാനിക്കുക." },
  video_custody: { hi: "\"डिजिटल अरेस्ट\" जैसी कोई चीज़ नहीं होती। असली पुलिस कभी वीडियो कॉल पर गिरफ़्तार नहीं करती। फ़ोन काट दें।", ml: "\"ഡിജിറ്റൽ അറസ്റ്റ്\" എന്നൊന്നില്ല. യഥാർത്ഥ പോലീസ് ഒരിക്കലും വീഡിയോ കോളിൽ ആരെയും അറസ്റ്റ് ചെയ്യില്ല. ഫോൺ കട്ട് ചെയ്യുക." },
  safe_account: { hi: "कोई पुलिस, अदालत या बैंक कभी पैसे 'सुरक्षित' खाते में डालने को नहीं कहता। कुछ भी ट्रांसफ़र न करें।", ml: "പോലീസോ കോടതിയോ ബാങ്കോ ഒരിക്കലും പണം 'സുരക്ഷിത' അക്കൗണ്ടിലേക്ക് മാറ്റാൻ പറയില്ല. ഒന്നും ട്രാൻസ്ഫർ ചെയ്യരുത്." },
  credentials: { hi: "किसी को भी कोड, OTP, PIN या पासवर्ड न बताएँ, बैंक से होने का दावा करने वाले को भी नहीं।", ml: "ആരോടും കോഡോ OTP-യോ PIN-ഓ പാസ്‌വേഡോ പറയരുത്, ബാങ്കിൽ നിന്നാണെന്ന് പറയുന്നവരോടും." },
  remote_access: { hi: "कॉल करने वाले के कहने पर कोई ऐप न डालें, न अपनी स्क्रीन शेयर करें।", ml: "വിളിക്കുന്നയാൾ പറഞ്ഞതുകൊണ്ട് ഒരു ആപ്പും ഇൻസ്റ്റാൾ ചെയ്യരുത്, സ്ക്രീൻ ഷെയർ ചെയ്യരുത്." },
  secrecy: { hi: "उन्होंने बात छिपाने या कॉल पर बने रहने को कहा। धोखेबाज़ यही करते हैं ताकि कोई आपको चेतावनी न दे। आप फ़ोन काट सकते हैं।", ml: "രഹസ്യമാക്കാനോ കോളിൽ തുടരാനോ അവർ പറഞ്ഞു. ആരും മുന്നറിയിപ്പ് തരാതിരിക്കാൻ തട്ടിപ്പുകാർ ചെയ്യുന്നതാണിത്. നിങ്ങൾക്ക് ഫോൺ കട്ട് ചെയ്യാം." },
  authority: { hi: "असली पुलिस, सीबीआई, कस्टम और अदालतें कभी कॉल पर पैसे नहीं माँगतीं।", ml: "യഥാർത്ഥ പോലീസും സിബിഐയും കസ്റ്റംസും കോടതിയും ഒരിക്കലും കോളിൽ പണം ചോദിക്കില്ല." },
  gift_card_crypto: { hi: "कोई असली व्यक्ति गिफ़्ट कार्ड या क्रिप्टो में पैसे नहीं माँगता। कुछ न खरीदें।", ml: "യഥാർത്ഥ ആരും ഗിഫ്റ്റ് കാർഡിലോ ക്രിപ്റ്റോയിലോ പണം ചോദിക്കില്ല. ഒന്നും വാങ്ങരുത്." },
  payment_demand: { hi: "इस कॉल के दौरान पैसे न भेजें। फ़ोन काटें और पहले जाँच करें।", ml: "ഈ കോളിനിടെ പണം അയയ്ക്കരുത്. ഫോൺ കട്ട് ചെയ്ത് ആദ്യം പരിശോധിക്കുക." },
  utility_threat: { hi: "सेवा देने वाली कंपनियाँ और बैंक फ़ोन पर कनेक्शन नहीं काटते। फ़ोन काटें और बिल या कार्ड पर लिखे नंबर पर कॉल करें।", ml: "സേവനദാതാക്കളും ബാങ്കുകളും ഫോൺ കോളിലൂടെ കണക്ഷൻ വിച്ഛേദിക്കില്ല. ഫോൺ കട്ട് ചെയ്ത് ബില്ലിലോ കാർഡിലോ ഉള്ള നമ്പറിൽ വിളിക്കുക." },
  urgency: { hi: "वे जल्दी मचा रहे हैं। धोखेबाज़ जल्दी मचाते हैं। आप आराम से सोच सकते हैं और फ़ोन काट सकते हैं।", ml: "അവർ തിടുക്കം കൂട്ടുന്നു. തട്ടിപ്പുകാരാണ് തിടുക്കം കൂട്ടുന്നത്. നിങ്ങൾക്ക് സാവധാനം ആലോചിക്കാം, ഫോൺ കട്ട് ചെയ്യാം." },
};

/** A Call Guard question in the UI language. */
export function callQuestionText(id: string, english: string, lang: UiLang): string {
  return lang === "en" ? english : CALL_Q[id]?.[lang] ?? english;
}

/** A Call Guard warning in the UI language (keyed by the rule that produced it). */
export function callWarningText(ruleId: string | null, english: string, lang: UiLang): string {
  if (lang === "en" || !ruleId) return english;
  const key = ruleId === "advance_fee" || ruleId === "ff_request" ? "payment_demand" : ruleId === "account_block" ? "utility_threat" : ruleId;
  return CALL_W[key]?.[lang] ?? english;
}

// ---- Scam radar ----
const RADAR_P: Record<RadarPattern, Loc> = {
  digital_arrest: { hi: "\"डिजिटल अरेस्ट\" / नकली पुलिस कॉल", ml: "\"ഡിജിറ്റൽ അറസ്റ്റ്\" / വ്യാജ പോലീസ് കോളുകൾ" },
  bank_kyc: { hi: "बैंक या KYC बंद होने की धमकी, OTP की माँग", ml: "ബാങ്ക് അല്ലെങ്കിൽ KYC ബ്ലോക്ക്, OTP ആവശ്യപ്പെടൽ" },
  electricity: { hi: "बिजली या फ़ोन काटने की धमकी", ml: "വൈദ്യുതി അല്ലെങ്കിൽ ഫോൺ വിച്ഛേദിക്കുമെന്ന ഭീഷണി" },
  job_task: { hi: "आसान कमाई वाली नौकरी और टास्क", ml: "എളുപ്പ വരുമാന ജോലികളും ടാസ്കുകളും" },
  prize_lottery: { hi: "इनाम और लॉटरी", ml: "സമ്മാനങ്ങളും ലോട്ടറികളും" },
  investment: { hi: "निवेश, क्रिप्टो और गिफ़्ट कार्ड", ml: "നിക്ഷേപം, ക്രിപ്റ്റോ, ഗിഫ്റ്റ് കാർഡുകൾ" },
  family_emergency: { hi: "\"नया नंबर\" वाली पारिवारिक मुसीबत", ml: "\"പുതിയ നമ്പർ\" കുടുംബ അത്യാവശ്യങ്ങൾ" },
  romance: { hi: "प्यार और ऑनलाइन दोस्तों की पैसे की माँग", ml: "പ്രണയവും ഓൺലൈൻ സുഹൃത്തുക്കളുടെ പണം ആവശ്യപ്പെടലും" },
  other: { hi: "दूसरी धोखाधड़ी", ml: "മറ്റ് തട്ടിപ്പുകൾ" },
};

/** A scam-radar pattern name in the UI language. */
export function radarPatternText(p: RadarPattern, lang: UiLang): string {
  return lang === "en" ? RADAR_PATTERN_LABELS[p] : RADAR_P[p][lang];
}
