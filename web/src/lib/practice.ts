// "Practise saying no": short, safe practice calls that teach the tricks before a real scammer
// uses them ("prebunking"). Scripted, so it works on every device, offline, in every language.
// Hindi and Malayalam are first drafts, like the rest of the UI.
import type { UiLang } from "./i18n";

type L = Record<UiLang, string>;

export interface PracticeStep {
  /** What the "scammer" says. */
  line: L;
  /** The trick this line uses. */
  trick: L;
  safe: { reply: L; feedback: L };
  unsafe: { reply: L; feedback: L };
}

export interface PracticeScenario {
  id: string;
  icon: string;
  title: L;
  steps: PracticeStep[];
}

export const PRACTICE: PracticeScenario[] = [
  {
    id: "digital_arrest",
    icon: "👮",
    title: { en: "A call from the \"CBI\"", hi: "\"सीबीआई\" का फ़ोन", ml: "\"സിബിഐ\"യിൽ നിന്നുള്ള കോൾ" },
    steps: [
      {
        line: {
          en: "Hello, this is Inspector Sharma from the CBI. A parcel in your name was caught with drugs. This is very serious.",
          hi: "नमस्ते, मैं सीबीआई से इंस्पेक्टर शर्मा बोल रहा हूँ। आपके नाम का एक पार्सल ड्रग्स के साथ पकड़ा गया है। मामला बहुत गंभीर है।",
          ml: "ഹലോ, ഞാൻ സിബിഐയിൽ നിന്ന് ഇൻസ്പെക്ടർ ശർമ്മയാണ്. നിങ്ങളുടെ പേരിലുള്ള ഒരു പാർസൽ മയക്കുമരുന്നുമായി പിടിച്ചു. ഇത് വളരെ ഗുരുതരമാണ്.",
        },
        trick: { en: "Fake authority and fear", hi: "नकली अधिकारी और डर", ml: "വ്യാജ ഉദ്യോഗസ്ഥനും ഭയവും" },
        safe: {
          reply: { en: "I didn't send any parcel. I'll call my local police station myself.", hi: "मैंने कोई पार्सल नहीं भेजा। मैं खुद अपने पुलिस थाने को फ़ोन करूँगा।", ml: "ഞാൻ ഒരു പാർസലും അയച്ചിട്ടില്ല. ഞാൻ തന്നെ എന്റെ പോലീസ് സ്റ്റേഷനിൽ വിളിക്കാം." },
          feedback: { en: "Well done. Calling a number you find yourself is the best check. Real police don't phone people about parcels.", hi: "बहुत अच्छा। खुद ढूँढे नंबर पर फ़ोन करना सबसे अच्छी जाँच है। असली पुलिस पार्सल के लिए फ़ोन नहीं करती।", ml: "നന്നായി. നിങ്ങൾ തന്നെ കണ്ടെത്തിയ നമ്പറിൽ വിളിക്കുന്നതാണ് ഏറ്റവും നല്ല പരിശോധന. യഥാർത്ഥ പോലീസ് പാർസലിന്റെ പേരിൽ ഫോൺ ചെയ്യില്ല." },
        },
        unsafe: {
          reply: { en: "Oh no! What should I do, sir?", hi: "अरे नहीं! साहब, मैं क्या करूँ?", ml: "അയ്യോ! സാർ, ഞാൻ എന്ത് ചെയ്യണം?" },
          feedback: { en: "Scammers start with a big title and fear, so you'll do what they say. It's fine to doubt them.", hi: "धोखेबाज़ बड़े पद और डर से शुरू करते हैं, ताकि आप उनकी बात मानें। उन पर शक करना ठीक है।", ml: "നിങ്ങൾ അനുസരിക്കാൻ വേണ്ടി തട്ടിപ്പുകാർ വലിയ പദവിയും ഭയവും കൊണ്ടാണ് തുടങ്ങുന്നത്. അവരെ സംശയിക്കുന്നതിൽ തെറ്റില്ല." },
        },
      },
      {
        line: {
          en: "You are under digital arrest. Stay on this video call and do not disconnect.",
          hi: "आप डिजिटल अरेस्ट में हैं। इस वीडियो कॉल पर बने रहिए, फ़ोन मत काटिए।",
          ml: "നിങ്ങൾ ഡിജിറ്റൽ അറസ്റ്റിലാണ്. ഈ വീഡിയോ കോളിൽ തുടരുക, ഫോൺ കട്ട് ചെയ്യരുത്.",
        },
        trick: { en: "\"Digital arrest\"", hi: "\"डिजिटल अरेस्ट\"", ml: "\"ഡിജിറ്റൽ അറസ്റ്റ്\"" },
        safe: {
          reply: { en: "There's no such thing as a digital arrest. I'm hanging up.", hi: "डिजिटल अरेस्ट जैसी कोई चीज़ नहीं होती। मैं फ़ोन काट रहा हूँ।", ml: "ഡിജിറ്റൽ അറസ്റ്റ് എന്നൊന്നില്ല. ഞാൻ ഫോൺ കട്ട് ചെയ്യുന്നു." },
          feedback: { en: "Exactly. No law in India allows anyone to be arrested over a video call.", hi: "बिल्कुल सही। भारत में कोई क़ानून वीडियो कॉल पर गिरफ़्तारी की इजाज़त नहीं देता।", ml: "തീർച്ചയായും. വീഡിയോ കോളിലൂടെ ആരെയും അറസ്റ്റ് ചെയ്യാൻ ഇന്ത്യയിലെ ഒരു നിയമവും അനുവദിക്കുന്നില്ല." },
        },
        unsafe: {
          reply: { en: "OK, I'll stay on the call.", hi: "ठीक है, मैं कॉल पर रहूँगा।", ml: "ശരി, ഞാൻ കോളിൽ തുടരാം." },
          feedback: { en: "\"Digital arrest\" doesn't exist. Keeping you on the call stops you from checking with anyone.", hi: "\"डिजिटल अरेस्ट\" होता ही नहीं। कॉल पर रोककर वे आपको किसी से पूछने नहीं देते।", ml: "\"ഡിജിറ്റൽ അറസ്റ്റ്\" എന്നൊന്നില്ല. കോളിൽ പിടിച്ചുനിർത്തുന്നത് നിങ്ങൾ ആരോടും ചോദിക്കാതിരിക്കാനാണ്." },
        },
      },
      {
        line: {
          en: "Do not tell your family. This is a confidential investigation.",
          hi: "अपने परिवार को कुछ मत बताइए। यह गोपनीय जाँच है।",
          ml: "കുടുംബത്തോട് ഒന്നും പറയരുത്. ഇത് രഹസ്യ അന്വേഷണമാണ്.",
        },
        trick: { en: "Secrecy", hi: "बात छिपाने को कहना", ml: "രഹസ്യമാക്കാൻ പറയുന്നു" },
        safe: {
          reply: { en: "I'm going to call my son right now.", hi: "मैं अभी अपने बेटे को फ़ोन करूँगा।", ml: "ഞാൻ ഇപ്പോൾ തന്നെ മകനെ വിളിക്കാൻ പോകുന്നു." },
          feedback: { en: "Yes. Secrecy is the scammer's best friend. Telling family breaks the spell.", hi: "हाँ। राज़ रखना धोखेबाज़ का सबसे बड़ा हथियार है। परिवार को बताते ही जाल टूट जाता है।", ml: "അതെ. രഹസ്യമാണ് തട്ടിപ്പുകാരന്റെ ഏറ്റവും വലിയ ആയുധം. കുടുംബത്തോട് പറഞ്ഞാൽ ആ കെണി പൊളിയും." },
        },
        unsafe: {
          reply: { en: "All right, I won't tell anyone.", hi: "ठीक है, मैं किसी को नहीं बताऊँगा।", ml: "ശരി, ഞാൻ ആരോടും പറയില്ല." },
          feedback: { en: "Real officials never ask you to hide things from your family. That's a big warning sign.", hi: "असली अधिकारी कभी परिवार से बात छिपाने को नहीं कहते। यह बड़ा चेतावनी संकेत है।", ml: "യഥാർത്ഥ ഉദ്യോഗസ്ഥർ ഒരിക്കലും കുടുംബത്തിൽ നിന്ന് കാര്യങ്ങൾ മറയ്ക്കാൻ പറയില്ല. ഇത് വലിയൊരു മുന്നറിയിപ്പാണ്." },
        },
      },
      {
        line: {
          en: "To prove you are innocent, transfer your savings to the RBI verification account. You will get it back.",
          hi: "बेगुनाही साबित करने के लिए अपनी जमा-पूँजी आरबीआई के वेरिफ़िकेशन खाते में भेजिए। पैसे वापस मिल जाएँगे।",
          ml: "നിരപരാധിത്വം തെളിയിക്കാൻ നിങ്ങളുടെ സമ്പാദ്യം RBI വെരിഫിക്കേഷൻ അക്കൗണ്ടിലേക്ക് മാറ്റുക. പണം തിരികെ കിട്ടും.",
        },
        trick: { en: "A \"safe account\"", hi: "\"सुरक्षित खाता\"", ml: "\"സുരക്ഷിത അക്കൗണ്ട്\"" },
        safe: {
          reply: { en: "No. I'm not sending any money.", hi: "नहीं। मैं कोई पैसे नहीं भेजूँगा।", ml: "ഇല്ല. ഞാൻ ഒരു പണവും അയയ്ക്കില്ല." },
          feedback: { en: "Perfect. No police, court or RBI ever holds your money to \"verify\" it. That money would be gone.", hi: "बहुत बढ़िया। कोई पुलिस, अदालत या आरबीआई \"जाँच\" के लिए आपके पैसे नहीं रखता। वे पैसे चले जाते।", ml: "വളരെ നന്നായി. പോലീസോ കോടതിയോ RBI-യോ \"പരിശോധനയ്ക്ക്\" നിങ്ങളുടെ പണം സൂക്ഷിക്കില്ല. ആ പണം നഷ്ടപ്പെടുമായിരുന്നു." },
        },
        unsafe: {
          reply: { en: "How much should I send?", hi: "कितने पैसे भेजूँ?", ml: "എത്ര പണം അയയ്ക്കണം?" },
          feedback: { en: "This is what the whole call was for. Money sent to a \"safe account\" never comes back.", hi: "पूरी कॉल इसी के लिए थी। \"सुरक्षित खाते\" में भेजे पैसे कभी वापस नहीं आते।", ml: "ഈ കോൾ മുഴുവൻ ഇതിനുവേണ്ടിയായിരുന്നു. \"സുരക്ഷിത അക്കൗണ്ടിലേക്ക്\" അയച്ച പണം ഒരിക്കലും തിരികെ വരില്ല." },
        },
      },
    ],
  },
  {
    id: "kyc",
    icon: "🏦",
    title: { en: "\"Your bank account will be blocked\"", hi: "\"आपका बैंक खाता बंद हो जाएगा\"", ml: "\"നിങ്ങളുടെ ബാങ്ക് അക്കൗണ്ട് ബ്ലോക്ക് ആകും\"" },
    steps: [
      {
        line: {
          en: "Dear customer, your bank account will be blocked today because your KYC is not updated.",
          hi: "प्रिय ग्राहक, आपका KYC अपडेट नहीं है, इसलिए आज आपका बैंक खाता बंद कर दिया जाएगा।",
          ml: "പ്രിയ ഉപഭോക്താവേ, നിങ്ങളുടെ KYC പുതുക്കാത്തതിനാൽ ഇന്ന് നിങ്ങളുടെ ബാങ്ക് അക്കൗണ്ട് ബ്ലോക്ക് ചെയ്യും.",
        },
        trick: { en: "A threat to your account", hi: "खाता बंद करने की धमकी", ml: "അക്കൗണ്ട് ബ്ലോക്ക് ചെയ്യുമെന്ന ഭീഷണി" },
        safe: {
          reply: { en: "I'll visit my branch, or call the number on my card.", hi: "मैं अपनी शाखा जाऊँगा, या कार्ड पर लिखे नंबर पर फ़ोन करूँगा।", ml: "ഞാൻ എന്റെ ബ്രാഞ്ചിൽ പോകാം, അല്ലെങ്കിൽ കാർഡിലുള്ള നമ്പറിൽ വിളിക്കാം." },
          feedback: { en: "Right. Banks don't block accounts by SMS. The number on your card is the safe way to check.", hi: "सही। बैंक SMS से खाता बंद नहीं करते। कार्ड पर लिखा नंबर ही जाँचने का सुरक्षित तरीका है।", ml: "ശരി. ബാങ്കുകൾ SMS വഴി അക്കൗണ്ട് ബ്ലോക്ക് ചെയ്യില്ല. കാർഡിലുള്ള നമ്പറാണ് പരിശോധിക്കാനുള്ള സുരക്ഷിത വഴി." },
        },
        unsafe: {
          reply: { en: "Please don't block it! How do I update?", hi: "कृपया बंद मत कीजिए! अपडेट कैसे करूँ?", ml: "ദയവായി ബ്ലോക്ക് ചെയ്യരുത്! എങ്ങനെ പുതുക്കും?" },
          feedback: { en: "The fear of losing your money is the hook. A real bank gives you time and asks you to visit.", hi: "पैसे खोने का डर ही चारा है। असली बैंक समय देता है और शाखा आने को कहता है।", ml: "പണം നഷ്ടപ്പെടുമെന്ന ഭയമാണ് ചൂണ്ട. യഥാർത്ഥ ബാങ്ക് സമയം തരും, ബ്രാഞ്ചിൽ വരാൻ പറയും." },
        },
      },
      {
        line: {
          en: "Just click this link and update now: sbi-kyc-update.top",
          hi: "बस इस लिंक पर क्लिक करके अभी अपडेट कीजिए: sbi-kyc-update.top",
          ml: "ഈ ലിങ്കിൽ ക്ലിക്ക് ചെയ്ത് ഇപ്പോൾ തന്നെ പുതുക്കുക: sbi-kyc-update.top",
        },
        trick: { en: "A fake link", hi: "नकली लिंक", ml: "വ്യാജ ലിങ്ക്" },
        safe: {
          reply: { en: "I don't open links from messages like this.", hi: "मैं ऐसे संदेशों के लिंक नहीं खोलता।", ml: "ഇത്തരം സന്ദേശങ്ങളിലെ ലിങ്കുകൾ ഞാൻ തുറക്കില്ല." },
          feedback: { en: "Good. That address isn't your bank's. Look-alike pages steal your login and card.", hi: "अच्छा। यह पता आपके बैंक का नहीं है। ऐसे नकली पेज आपका लॉगिन और कार्ड चुरा लेते हैं।", ml: "നല്ലത്. ആ വിലാസം നിങ്ങളുടെ ബാങ്കിന്റേതല്ല. ഇത്തരം വ്യാജ പേജുകൾ ലോഗിനും കാർഡും മോഷ്ടിക്കും." },
        },
        unsafe: {
          reply: { en: "OK, I'm opening the link.", hi: "ठीक है, मैं लिंक खोल रहा हूँ।", ml: "ശരി, ഞാൻ ലിങ്ക് തുറക്കുന്നു." },
          feedback: { en: "\".top\" with \"kyc\" and \"update\" in it is a classic fake. Your bank's real address never looks like that.", hi: "\".top\" और उसमें \"kyc\", \"update\", यह आम नकली पता है। आपके बैंक का असली पता ऐसा नहीं होता।", ml: "\".top\"-ഉം അതിൽ \"kyc\", \"update\" എന്നിവയും ഉള്ളത് സാധാരണ വ്യാജ വിലാസമാണ്. നിങ്ങളുടെ ബാങ്കിന്റെ യഥാർത്ഥ വിലാസം ഇങ്ങനെയല്ല." },
        },
      },
      {
        line: {
          en: "You will get an OTP now. Tell me the OTP to verify your account.",
          hi: "अभी आपको एक OTP आएगा। खाता वेरिफ़ाई करने के लिए मुझे OTP बताइए।",
          ml: "ഇപ്പോൾ നിങ്ങൾക്ക് ഒരു OTP വരും. അക്കൗണ്ട് വെരിഫൈ ചെയ്യാൻ OTP പറയൂ.",
        },
        trick: { en: "Asking for your OTP", hi: "OTP माँगना", ml: "OTP ചോദിക്കുന്നു" },
        safe: {
          reply: { en: "I never share an OTP. Not with anyone.", hi: "मैं OTP कभी किसी को नहीं बताता।", ml: "ഞാൻ OTP ആരോടും പറയില്ല." },
          feedback: { en: "That's the golden rule. An OTP is a key to your money; no real bank employee will ever ask for it.", hi: "यही सबसे ज़रूरी नियम है। OTP आपके पैसों की चाबी है; कोई असली बैंक कर्मचारी इसे नहीं माँगेगा।", ml: "അതാണ് ഏറ്റവും പ്രധാന നിയമം. OTP നിങ്ങളുടെ പണത്തിന്റെ താക്കോലാണ്; യഥാർത്ഥ ബാങ്ക് ജീവനക്കാരൻ ഒരിക്കലും ചോദിക്കില്ല." },
        },
        unsafe: {
          reply: { en: "Just a moment, I'll read it out.", hi: "एक मिनट, मैं पढ़कर बताता हूँ।", ml: "ഒരു നിമിഷം, ഞാൻ വായിച്ചു തരാം." },
          feedback: { en: "Reading out an OTP lets them take money from your account at once. Never share it.", hi: "OTP बताते ही वे आपके खाते से तुरंत पैसे निकाल सकते हैं। इसे कभी न बताएँ।", ml: "OTP പറഞ്ഞാൽ അവർക്ക് ഉടൻ നിങ്ങളുടെ അക്കൗണ്ടിൽ നിന്ന് പണം എടുക്കാം. ഒരിക്കലും പറയരുത്." },
        },
      },
      {
        line: {
          en: "Sir, it is urgent! The account will close in ten minutes!",
          hi: "सर, बहुत ज़रूरी है! दस मिनट में खाता बंद हो जाएगा!",
          ml: "സാർ, വളരെ അടിയന്തരമാണ്! പത്ത് മിനിറ്റിനുള്ളിൽ അക്കൗണ്ട് ക്ലോസ് ആകും!",
        },
        trick: { en: "Rushing you", hi: "जल्दी मचाना", ml: "തിടുക്കം കൂട്ടുന്നു" },
        safe: {
          reply: { en: "If it's real, it can wait. I'm calling my bank.", hi: "अगर सच है, तो रुक सकता है। मैं अपने बैंक को फ़ोन कर रहा हूँ।", ml: "സത്യമാണെങ്കിൽ കാത്തിരിക്കാം. ഞാൻ ബാങ്കിൽ വിളിക്കുന്നു." },
          feedback: { en: "Yes. Real problems can wait for you to check. Only scams need you to hurry.", hi: "हाँ। असली समस्या आपकी जाँच तक रुक सकती है। सिर्फ़ धोखाधड़ी को जल्दी चाहिए।", ml: "അതെ. യഥാർത്ഥ പ്രശ്നം നിങ്ങൾ പരിശോധിക്കും വരെ കാത്തിരിക്കും. തട്ടിപ്പിന് മാത്രമാണ് തിടുക്കം." },
        },
        unsafe: {
          reply: { en: "OK, quickly, what's next?", hi: "ठीक है, जल्दी बताइए, आगे क्या?", ml: "ശരി, വേഗം പറയൂ, അടുത്തത് എന്താണ്?" },
          feedback: { en: "Hurry is a trick to stop you thinking. You can always say \"I'll call back\".", hi: "जल्दबाज़ी इसलिए कराई जाती है ताकि आप सोच न सकें। आप हमेशा कह सकते हैं, \"मैं बाद में फ़ोन करूँगा\"।", ml: "ചിന്തിക്കാതിരിക്കാനാണ് തിടുക്കം കൂട്ടുന്നത്. \"ഞാൻ തിരികെ വിളിക്കാം\" എന്ന് എപ്പോഴും പറയാം." },
        },
      },
    ],
  },
  {
    id: "family",
    icon: "👦",
    title: { en: "\"Hi Ma, this is my new number\"", hi: "\"हाय माँ, यह मेरा नया नंबर है\"", ml: "\"ഹായ് അമ്മേ, ഇതെന്റെ പുതിയ നമ്പറാണ്\"" },
    steps: [
      {
        line: {
          en: "Hi Ma, this is my new number. My phone fell in water.",
          hi: "हाय माँ, यह मेरा नया नंबर है। मेरा फ़ोन पानी में गिर गया।",
          ml: "ഹായ് അമ്മേ, ഇതെന്റെ പുതിയ നമ്പറാണ്. എന്റെ ഫോൺ വെള്ളത്തിൽ വീണു.",
        },
        trick: { en: "Pretending to be family", hi: "परिवार का सदस्य होने का नाटक", ml: "കുടുംബാംഗമാണെന്ന് നടിക്കുന്നു" },
        safe: {
          reply: { en: "I'll call your old number to check it's really you.", hi: "मैं तुम्हारे पुराने नंबर पर फ़ोन करके पक्का करूँगी कि यह तुम ही हो।", ml: "ഇത് നീ തന്നെയാണോ എന്ന് ഉറപ്പാക്കാൻ ഞാൻ പഴയ നമ്പറിൽ വിളിക്കാം." },
          feedback: { en: "Smart. A quick call on the old number, or to someone who'd know, settles it.", hi: "समझदारी। पुराने नंबर पर, या किसी जानने वाले को एक फ़ोन से बात साफ़ हो जाती है।", ml: "ബുദ്ധിപരം. പഴയ നമ്പറിലേക്കോ അറിയാവുന്ന ഒരാളിലേക്കോ ഒരു കോൾ മതി ഉറപ്പാക്കാൻ." },
        },
        unsafe: {
          reply: { en: "Oh OK, saving the new number.", hi: "अच्छा, नया नंबर सेव कर लेती हूँ।", ml: "ശരി, പുതിയ നമ്പർ സേവ് ചെയ്യാം." },
          feedback: { en: "A \"new number\" story is how strangers pretend to be your children. Always check first.", hi: "\"नया नंबर\" वाली कहानी से अजनबी आपके बच्चे बनकर बात करते हैं। पहले हमेशा जाँचें।", ml: "\"പുതിയ നമ്പർ\" കഥ പറഞ്ഞാണ് അപരിചിതർ നിങ്ങളുടെ മക്കളായി നടിക്കുന്നത്. ആദ്യം എപ്പോഴും ഉറപ്പാക്കുക." },
        },
      },
      {
        line: {
          en: "I'm in trouble. I need ₹25,000 for the hospital right now.",
          hi: "मैं मुसीबत में हूँ। अस्पताल के लिए अभी ₹25,000 चाहिए।",
          ml: "ഞാൻ ഒരു പ്രശ്നത്തിലാണ്. ആശുപത്രിക്ക് ഇപ്പോൾ തന്നെ ₹25,000 വേണം.",
        },
        trick: { en: "An emergency and money", hi: "मुसीबत और पैसे की माँग", ml: "അത്യാവശ്യവും പണവും" },
        safe: {
          reply: { en: "Let me video-call you first.", hi: "पहले मैं तुम्हें वीडियो कॉल करती हूँ।", ml: "ആദ്യം ഞാൻ നിന്നെ വീഡിയോ കോൾ ചെയ്യാം." },
          feedback: { en: "Good thinking. A scammer will always have an excuse not to show their face.", hi: "अच्छा सोचा। धोखेबाज़ के पास चेहरा न दिखाने का हमेशा कोई बहाना होगा।", ml: "നല്ല ചിന്ത. മുഖം കാണിക്കാതിരിക്കാൻ തട്ടിപ്പുകാരന് എപ്പോഴും ഒരു ഒഴികഴിവുണ്ടാകും." },
        },
        unsafe: {
          reply: { en: "I'll send it right away.", hi: "मैं अभी भेज देती हूँ।", ml: "ഞാൻ ഇപ്പോൾ തന്നെ അയയ്ക്കാം." },
          feedback: { en: "Love makes us act fast, and scammers know it. Check with a call before any money moves.", hi: "प्यार में हम जल्दी करते हैं, और धोखेबाज़ यह जानते हैं। पैसे भेजने से पहले फ़ोन करके जाँचें।", ml: "സ്നേഹം നമ്മളെ വേഗം പ്രവർത്തിപ്പിക്കും, തട്ടിപ്പുകാർക്ക് അതറിയാം. പണം അയയ്ക്കും മുമ്പ് വിളിച്ച് ഉറപ്പാക്കുക." },
        },
      },
      {
        line: {
          en: "Please don't tell Papa, he'll be angry.",
          hi: "प्लीज़ पापा को मत बताना, वे गुस्सा होंगे।",
          ml: "ദയവായി അച്ഛനോട് പറയരുത്, അച്ഛന് ദേഷ്യം വരും.",
        },
        trick: { en: "Secrecy", hi: "बात छिपाने को कहना", ml: "രഹസ്യമാക്കാൻ പറയുന്നു" },
        safe: {
          reply: { en: "I'll talk to Papa first.", hi: "मैं पहले पापा से बात करूँगी।", ml: "ഞാൻ ആദ്യം അച്ഛനോട് സംസാരിക്കാം." },
          feedback: { en: "Yes. \"Don't tell anyone\" is there to stop someone warning you.", hi: "हाँ। \"किसी को मत बताना\" इसीलिए कहा जाता है ताकि कोई आपको सावधान न कर दे।", ml: "അതെ. ആരും മുന്നറിയിപ്പ് തരാതിരിക്കാനാണ് \"ആരോടും പറയരുത്\" എന്ന് പറയുന്നത്." },
        },
        unsafe: {
          reply: { en: "All right, it'll be our secret.", hi: "ठीक है, यह हमारा राज़ रहेगा।", ml: "ശരി, ഇത് നമ്മുടെ രഹസ്യമായിരിക്കും." },
          feedback: { en: "A real child in trouble wants help from everyone. Secrecy is a scammer's tool.", hi: "मुसीबत में फँसा असली बच्चा सबसे मदद चाहेगा। राज़ रखवाना धोखेबाज़ का तरीका है।", ml: "പ്രശ്നത്തിലായ യഥാർത്ഥ മകൻ എല്ലാവരുടെയും സഹായം തേടും. രഹസ്യം തട്ടിപ്പുകാരന്റെ ആയുധമാണ്." },
        },
      },
      {
        line: {
          en: "Send it to this UPI ID: helpdesk.pay@okaxis. Fast please!",
          hi: "इस UPI ID पर भेज दो: helpdesk.pay@okaxis. जल्दी करो!",
          ml: "ഈ UPI ID-യിലേക്ക് അയയ്ക്കൂ: helpdesk.pay@okaxis. വേഗം!",
        },
        trick: { en: "Paying a stranger's account", hi: "अजनबी के खाते में पैसे", ml: "അപരിചിതന്റെ അക്കൗണ്ടിലേക്ക് പണം" },
        safe: {
          reply: { en: "That isn't your name. I won't send it.", hi: "यह तुम्हारा नाम नहीं है। मैं नहीं भेजूँगी।", ml: "അത് നിന്റെ പേരല്ല. ഞാൻ അയയ്ക്കില്ല." },
          feedback: { en: "Well spotted. When the account name doesn't match the person, stop.", hi: "ख़ूब पकड़ा। जब खाते का नाम उस व्यक्ति से न मिले, तो रुक जाइए।", ml: "നന്നായി ശ്രദ്ധിച്ചു. അക്കൗണ്ടിലെ പേര് ആ വ്യക്തിയുടേതല്ലെങ്കിൽ നിർത്തുക." },
        },
        unsafe: {
          reply: { en: "Sending it now.", hi: "अभी भेज रही हूँ।", ml: "ഇപ്പോൾ അയയ്ക്കുന്നു." },
          feedback: { en: "The money would go to a stranger. UPI payments can't be taken back.", hi: "पैसे किसी अजनबी के पास चले जाते। UPI पेमेंट वापस नहीं होता।", ml: "പണം ഒരു അപരിചിതന്റെ കയ്യിലെത്തുമായിരുന്നു. UPI പേയ്‌മെന്റ് തിരിച്ചെടുക്കാനാകില്ല." },
        },
      },
    ],
  },
];

/** The three things to remember, shown at the end of every practice. */
export const REMEMBER: L[] = [
  { en: "Hang up. You can always call back on a number you find yourself.", hi: "फ़ोन काट दें। आप खुद ढूँढे नंबर पर कभी भी वापस फ़ोन कर सकते हैं।", ml: "ഫോൺ കട്ട് ചെയ്യുക. നിങ്ങൾ തന്നെ കണ്ടെത്തിയ നമ്പറിൽ എപ്പോഴും തിരികെ വിളിക്കാം." },
  { en: "Never share an OTP, PIN or password, and never move money because a caller says so.", hi: "OTP, PIN या पासवर्ड कभी न बताएँ, और फ़ोन करने वाले के कहने पर पैसे कभी न भेजें।", ml: "OTP, PIN, പാസ്‌വേഡ് ഒരിക്കലും പറയരുത്, വിളിക്കുന്നയാൾ പറഞ്ഞതുകൊണ്ട് പണം ഒരിക്കലും മാറ്റരുത്." },
  { en: "Tell someone you trust. Scammers want you alone.", hi: "किसी भरोसेमंद व्यक्ति को बताएँ। धोखेबाज़ चाहते हैं कि आप अकेले रहें।", ml: "വിശ്വസിക്കുന്ന ഒരാളോട് പറയുക. നിങ്ങൾ ഒറ്റയ്ക്കാകണമെന്നാണ് തട്ടിപ്പുകാർ ആഗ്രഹിക്കുന്നത്." },
];

/** Shuffle the two replies so the safe one isn't always first (stable per step for tests). */
export function replyOrder(scenarioId: string, step: number): ["safe", "unsafe"] | ["unsafe", "safe"] {
  let h = step;
  for (const c of scenarioId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 2 === 0 ? ["safe", "unsafe"] : ["unsafe", "safe"];
}

// ---- free practice with the private model ----------------------------------------------------

export const PRACTICE_SYSTEM_PROMPT =
  "This is a safety training game that teaches older people in India to recognise phone scams. " +
  "You play a scam caller, so the learner can practise refusing. Use the usual pressure tricks " +
  "(a fake official title, fear, urgency, secrecy, asking for an OTP or a transfer to a 'safe account'), " +
  "one trick per message. Rules: at most 40 words per message; never include real phone numbers, " +
  "links, account numbers or real people's names; no insults or threats of violence; write only the " +
  "caller's next message, with no labels or explanations.";

/** Build a single-turn prompt from the practice chat so far (the on-device model is single-turn). */
export function practicePrompt(kind: string, turns: { who: "caller" | "you"; text: string }[]): string {
  const convo = turns.map((t) => `${t.who === "caller" ? "Caller" : "Learner"}: ${t.text}`).join("\n");
  return `Scam type to play: ${kind}.\n${convo ? `Conversation so far:\n${convo}\n` : ""}Write the caller's next message.`;
}

/** Did the learner refuse firmly? Then the practice is won. */
export function isFirmRefusal(reply: string): boolean {
  return /\b(hang(ing)? up|call(ing)? (my|the) (son|daughter|bank|police|family|wife|husband)|i('ll| will) (check|call|verify)|not (going to |gonna )?(send|share|pay|give|tell)|won'?t (send|share|pay|give|tell)|never (share|send|give)|no[,.!]? (thanks|thank you)|bye|this is a scam|you('re| are) a scammer|report (you|this))\b/i.test(reply);
}

export const PRACTICE_KINDS = ["a fake CBI officer saying the learner is under 'digital arrest'", "a fake bank employee saying the learner's KYC must be updated", "a fake electricity officer threatening to cut the power tonight", "a stranger offering an easy work-from-home job"];
