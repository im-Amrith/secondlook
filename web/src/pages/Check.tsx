import { useEffect, useRef, useState } from "react";
import type { CheckOutcome, ImageInput } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { prepareImage } from "../lib/image";
import { ResultCard } from "../components/ResultCard";
import { FamilyAlertButton } from "../components/FamilyAlertButton";
import { NANO_STATUS_TEXT } from "../lib/nano";

export const EXAMPLES = [
  { label: "\"CBI officer\" call", text: "This is Inspector Rajesh Sharma from CBI Mumbai. A parcel in your name has drugs and fake passports. You are under digital arrest. Stay on the video call and do not tell your family. Transfer Rs 4,50,000 to the RBI verification account 50100234567891 immediately. Call 9876543210." },
  { label: "Electricity cut-off", text: "Dear consumer, your electricity power will be disconnected tonight at 9:30 PM because your previous month bill was not updated. Please immediately contact our electricity officer 7012345678." },
  { label: "Son's normal message", text: "Hi Amma, reached Bangalore safely. Will call you after dinner. Don't forget your doctor appointment tomorrow at 10." },
];

export interface CheckPageProps {
  /** Text to check (e.g. from the extension's right-click menu). Changing it re-runs the check. */
  initialText?: string;
  initialKind?: "text" | "page";
  /** Monotonic id so the same text can be re-checked. */
  requestId?: number;
  compact?: boolean;
}

export function CheckPage({ initialText, initialKind = "text", requestId, compact }: CheckPageProps = {}) {
  const app = useApp();
  const [text, setText] = useState(initialText ?? "");
  const [image, setImage] = useState<{ input: ImageInput; previewUrl: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<null | ((ok: boolean) => void)>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outcome) resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [outcome]);

  async function runCheck(t: string, img: ImageInput | undefined, kind: "text" | "page" = "text") {
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      setOutcome(await app.check({ text: t, image: img, kind: img ? "image" : kind }, askImageConsent));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!initialText) return;
    setText(initialText);
    setImage(null);
    void runCheck(initialText, undefined, initialKind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText, requestId]);

  const askImageConsent = () => new Promise<boolean>((resolve) => setConsent(() => (ok: boolean) => { setConsent(null); resolve(ok); }));

  async function onCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !image) return;
    await runCheck(text, image?.input);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    try {
      const p = await prepareImage(f);
      setImage({ ...p, name: f.name });
    } catch {
      setError("We couldn't open that picture. Try a PNG or JPEG screenshot.");
    }
  }

  return (
    <div className="page">
      {!app.aiConfigured && (
        <div className="notice" role="note">
          <strong>AI not configured.</strong>{" "}
          {app.simulatedNano
            ? "Using a simulated on-device model (developer mode). The cloud check is off."
            : "SecondLook is running quick checks (rules only, on this device). Add the Firebase settings to turn on the AI check."}
        </div>
      )}
      {app.config.scamOfTheWeek && (
        <div className="notice notice-week" role="note"><strong>Scam of the week:</strong> {app.config.scamOfTheWeek}</div>
      )}

      {!compact && (
        <>
          <h1>Is this a scam?</h1>
          <p className="lead">Paste a message you're unsure about, or add a screenshot. We check it on your device first.</p>
        </>
      )}

      <form onSubmit={onCheck} className="check-form">
        <label htmlFor="msg" className="label">The message</label>
        <textarea id="msg" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the message here…" />
        <div className="row">
          <label className="file-button">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/*" onChange={(e) => void onFile(e.target.files?.[0])} />
            📷 {image ? "Change screenshot" : "Add a screenshot"}
          </label>
          {image && (
            <span className="thumb">
              <img src={image.previewUrl} alt="Screenshot to check" />
              <button type="button" className="link-button" onClick={() => setImage(null)}>Remove</button>
            </span>
          )}
        </div>
        <button className="primary big" type="submit" disabled={busy || (!text.trim() && !image)}>
          {busy ? "Checking…" : "Check this message"}
        </button>
        <p className="model-status muted">
          Private model: {app.simulatedNano ? `${NANO_STATUS_TEXT[app.nano]} (simulated, dev only)` : NANO_STATUS_TEXT[app.nano]}{" "}
          {app.nano !== "available" && <a href="#/setup">Set up</a>}
          {app.settings.neverCloud && <> · Cloud is off</>}
        </p>
      </form>

      {!compact && <div className="examples">
        <span className="muted">Try an example:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex.label} type="button" className="chip" onClick={() => { setText(ex.text); setImage(null); setOutcome(null); }}>{ex.label}</button>
        ))}
      </div>}

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div ref={resultRef}>
        {outcome && (
          <ResultCard
            outcome={outcome}
            simulated={app.simulatedNano}
            actions={<FamilyAlertButton verdict={outcome.verdict} />}
          />
        )}
      </div>

      {consent && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="consent-title">
          <div className="modal">
            <h2 id="consent-title">Send this screenshot to the cloud?</h2>
            <p>The private model isn't available on this device. We can remove personal details from typed text, but <strong>not from pictures</strong>. If you send it, the whole screenshot goes to Google's Gemini model to be checked.</p>
            <div className="row">
              <button className="primary" onClick={() => consent(true)}>Send the screenshot</button>
              <button className="secondary" onClick={() => consent(false)}>Keep it on my device</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
