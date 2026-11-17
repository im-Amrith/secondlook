# Read-aloud voices: intelligibility check

Each voice speaks a short scam warning (`scripts/tts-text.mts`); Whisper large-v3-turbo (q8, open) transcribes it back and we report the **character error rate** (CER) against the original text, after removing punctuation. Lower is better. It measures whether the words come through, not how natural the voice sounds, and Whisper's own errors are included. Whisper writes Malayalam speech in Devanagari, so for Malayalam the letters are shifted back into the Malayalam block first (approximate). Numbers read out as words ("एक हजार..." for 1930) count as errors.

Regenerate: `npm run tts:samples && npm run tts:eval`.

| Lang | Voice | Model | Download | Licence | CER | Whisper heard |
| --- | --- | --- | --- | --- | --- | --- |
| en | `kokoro-en-heart` | Kokoro-82M | 93 MB | Apache-2.0 | **0.0%** | This looks like a scam. Do not pay and do not share any code. Real police never ask for money on a video call. Hang up and call 1930 if you are worried. |
| en | `kokoro-en-michael` | Kokoro-82M | 93 MB | Apache-2.0 | **0.0%** | This looks like a scam. Do not pay and do not share any code. Real police never ask for money on a video call. Hang up and call 1930 if you are worried. |
| en | `piper-en-ljspeech` | Piper medium | 61 MB | Public domain (LJ Speech) training data, MIT model | **2.7%** | This looks like a scub. Do not pay and do not share any code. Real police never ask for money on a video call. Wing up and call 1930 if you are worried. |
| en | `piper-en-kristin` | Piper medium | 61 MB | Public domain (LibriVox) training data, MIT model | **4.1%** | This looks like a skim. Do not pay and do not share any code. Real police never risk for money on a video call. Hang up and call 1903 if you are worried. |
| hi | `kokoro-hi-alpha` | Kokoro-82M | 93 MB | Apache-2.0 | **5.7%** | यह दोखाधे लगती है पैसे मत भेजिए और कोई भी कोड किसी को मत बताए असली पुलिस कभी वीडियो कॉल पर पैसे नहीं मांगती फोन काट दीजिए और चीनता हो तो 1930 पर कॉल कीजिए |
| hi | `kokoro-hi-omega` | Kokoro-82M | 93 MB | Apache-2.0 | **18.4%** | यह दोखाधवी लगती है पैसे मत भेजिये और कोई भी कोड किसी को मत बताए असली पुलिस कभी वीडियो कॉल पर पैसे नहीं मांगती फोन कार्ट दीजिये और चिंता हो तो एक हजार नौसौतीस पर कॉल कीजिये |
| hi | `piper-hi-priyamvada` | Piper medium | 61 MB | CC BY-NC-SA 4.0 (training data) | **10.8%** | यहें दोखा धड़ी लगती हैं, पैसे मत भीजे और कोई भी कोड किसी को मत बताईए, असली पुलिस कभी वीडियो कॉल पर पैसे नहीं मांगती, फोन कार्ट दीजे और चिंता हो तो 1930 पर कॉल कीजे |
| hi | `piper-hi-rohan` | Piper medium | 60 MB | IndicTTS licence, non-commercial (training data) | **18.4%** | यहाँ धोखाधरी लगती है, पैसे मत भेजे, और कोई भी कोड किसी को मत बताईए, असली पुलिस कभी वीडियो कॉल पर पैसे नहीं मांगती, फोन काट दीजे, और चिनता हो तो एक हजर नौसो तीस पर कॉल कीजे |
| ml | `piper-ml-meera` | Piper medium | 60 MB | IndicTTS licence, non-commercial (training data) | **38.6%** | ഇതുരു തട്ടിപ്പാനന്ന തോനനു, പനമ് ആയക്യരുദു, ഉരു കോഡുമ് ആര്യോഡുമ് പരയരുദു, യദാര്ഥ പോലീസു ഉരിക്കേലുമ് വീഡിയോ, കോലേലു പനമ് ചോധികിലാ |
| ml | `piper-ml-arjun` | Piper medium | 60 MB | IndicTTS licence, non-commercial (training data) | **40.2%** | ഇദോരു തര്ടിപ്പാനന തോനുനൂ, പനമ് അയക്കേരിദ വരു കോഡുമ്, ആരോഡുമ് പരയരുദു യത്താഥ്ഥാ പോലീസ, വിരിക്യലിമ് വീഡിയോ, കോലില്പണമ് ചോധിക്കില്യാ |

## Speed in the browser

What decides the default for an older person is how long they wait for the first word. Measured in Chrome (the Claude desktop app's browser pane) on a Windows laptop, ONNX Runtime Web on **one WASM thread** (the app isn't cross-origin isolated; turning that on would break Firebase's sign-in popup), voices already downloaded:

| Voice | Audio | Time to make it | Real-time factor |
| --- | --- | --- | --- |
| Piper `piper-hi-rohan` | 3.8 s | 1.0 s | **0.27** (about 4x faster than real time) |
| Piper `piper-ml-meera` | 3.3 s | 1.8 s (first call, includes warm-up) | 0.55 |
| Kokoro `kokoro-hi-alpha` | 8.3 s | 21.8 s | **2.6** (slower than real time) |
| Kokoro `kokoro-en-heart` | 6.2 s | 60.9 s (worker still busy with an earlier long text) | up to 9.9 |

So the defaults are Piper (`DEFAULT_VOICE` in `web/src/lib/tts/voices.ts`): LJ Speech for English, Priyamvada for Hindi, Meera for Malayalam, picked by the CER above. Kokoro stays in Settings as the most natural option for people with a fast computer. The first chunk is one short sentence, so speech starts while the rest is being made.

First use downloads the voice (60 MB Piper / 93 MB Kokoro) plus about 30 MB of shared speech data (espeak-ng phonemizer data and the ONNX Runtime WASM). In the test the Hindi voice started speaking 33 s after the click, download included.

Licences: Kokoro-82M is Apache-2.0. Piper's code is MIT and the English voices are trained on public-domain data, but the **Hindi and Malayalam Piper voices are trained on non-commercial datasets**; a commercial release would need Kokoro Hindi (Apache-2.0, slower) or a licensed Malayalam voice.
