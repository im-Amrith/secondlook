# Call Guard speech recognition

Does Call Guard still catch a scam call in Hindi and Malayalam? Each made-up demo call (`DEMO_CALL` in `web/src/lib/listen.ts`) is spoken by a Piper voice, cut into 6-second pieces like the browser does, transcribed by an open Whisper model (q8, ONNX, CPU in Node), and fed through the Call Guard rules (`shared/src/call.ts`). **Risk** is what Call Guard ended on. CER is the character error rate against the script (lower is better); RTF is processing time ÷ audio length on this laptop's CPU (below 1 keeps up with the call; the browser is similar on WASM and much faster with WebGPU).

Synthetic speech is cleaner than a real phone on speaker, so treat these as a best case. Regenerate: `npm run asr:eval`.

| Model | Lang | CER | RTF (CPU) | Risk | Signals heard |
| --- | --- | --- | --- | --- | --- |
| `whisper-base` | en | 22.3% | 0.17 | **high** | video_custody, safe_account, secrecy, urgency |
| `whisper-base` | hi | 84.4% | 0.20 | **high** | video_custody, authority |
| `whisper-base` | ml | 87.9% | 0.23 | **medium** | safe_account |
| `whisper-hindi-small-ONNX` | hi | 29.4% | 0.67 | **high** | video_custody, safe_account, secrecy, authority, urgency |
| `whisper-small` | ml | 87.3% | 0.74 | **high** | video_custody, authority |
| `whisper-small` (translate to English) | ml | 88.5% | 0.53 | **high** | video_custody, secrecy, authority, urgency |

**What ships** (`web/src/lib/asr/protocol.ts`): Hindi uses `whisper-hindi-small-ONNX` (all five scam signals heard, readable Devanagari). Malayalam uses `whisper-small` **translating to English**: its Malayalam transcripts loop into garbage (the high score on that row comes from a few English words like "Inspector"), while the English translation keeps "arrested", "don't let anyone know" and the "RBI verification account" for the rules. CER for the translate row compares English text with the Malayalam script, so it isn't meaningful there. English uses `whisper-base` only when Chrome has no on-device speech pack. Results vary a little between runs because Piper's voices are randomised; stock `whisper-base` reached anything from low to high on Hindi across runs, which is why it isn't used for Hindi or Malayalam.
