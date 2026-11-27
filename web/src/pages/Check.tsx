import { useEffect, useRef, useState } from "react";
import { scoreRules, type CheckOutcome, type ImageInput } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { prepareImage } from "../lib/image";
import { ResultCard } from "../components/ResultCard";
import { FamilyAlertButton } from "../components/FamilyAlertButton";
import { FollowUp } from "../components/FollowUp";
import { RoutePreview } from "../components/RoutePreview";
import { RadarButton } from "../components/RadarButton";
import { useT } from "../lib/useT";
import { Camera, Ico } from "../components/icons";
import { CallBanner, CheckSidebar } from "../components/CheckSidebar";

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
  const { t } = useT();
  const [text, setText] = useState(initialText ?? "");
  const [image, setImage] = useState<{ input: ImageInput; previewUrl: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedText, setCheckedText] = useState("");
  const [consent, setConsent] = useState<null | ((ok: boolean) => void)>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outcome) resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [outcome]);

  async function runCheck(t: string, img: ImageInput | undefined, kind: "text" | "page" = "text") {
    setBusy(true);
    setError(null);
    setOutcome(null);
    setCheckedText(t);
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
      setError(t("check.badImage"));
    }
  }

  return (
    <div className={compact ? "page" : "page page-wide"}>
      {!app.aiConfigured && (
        <div className="notice" role="note">
          <strong>{t("notice.aiOff")}</strong> {app.simulatedNano ? t("notice.simulated") : t("notice.rulesOnly")}
        </div>
      )}
      {app.config.scamOfTheWeek && (
        <div className="notice notice-week" role="note"><strong>{t("notice.week")}</strong> {app.config.scamOfTheWeek}</div>
      )}

      {!compact && <div className="top-banner"><CallBanner /></div>}

      <div className={compact ? undefined : "check-layout"}>
      <div className="check-main">
      {!compact && (
        <>
          <h1>{t("check.title")}</h1>
          <p className="lead">{t("check.lead")}</p>
        </>
      )}

      <form onSubmit={onCheck} className="check-form">
        <label htmlFor="msg" className="label">{t("check.label")}</label>
        <textarea id="msg" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("check.placeholder")} />
        <div className="row">
          <label className="file-button">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/*" onChange={(e) => void onFile(e.target.files?.[0])} />
            <Ico icon={Camera} /> {image ? t("check.changeShot") : t("check.addShot")}
          </label>
          {image && (
            <span className="thumb">
              <img src={image.previewUrl} alt={t("check.shotAlt")} />
              <button type="button" className="link-button" onClick={() => setImage(null)}>{t("check.remove")}</button>
            </span>
          )}
        </div>
        <button className="primary big" type="submit" disabled={busy || (!text.trim() && !image)}>
          {busy ? t("check.checking") : t("check.button")}
        </button>
        <RoutePreview text={text} hasImage={!!image} />
        <p className="model-status muted">
          {t("check.privateModel")} {t(`nano.${app.nano}`)}{app.simulatedNano && ` ${t("check.simulated")}`}{" "}
          {app.nano !== "available" && <a href="#/setup">{t("check.setUp")}</a>}
          {app.settings.neverCloud && <> · {t("check.cloudOff")}</>}
        </p>
      </form>

      {!compact && <div className="examples">
        <span className="muted">{t("check.tryExample")}</span>
        {EXAMPLES.map((ex) => (
          <button key={ex.label} type="button" className="chip" onClick={() => { setText(ex.text); setImage(null); setOutcome(null); }}>{ex.label}</button>
        ))}
      </div>}

      </div>
      {!compact && <CheckSidebar />}
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div ref={resultRef} className="check-result">
        {outcome && (
          <ResultCard
            outcome={outcome}
            simulated={app.simulatedNano}
            actions={
              <>
                {outcome.verdict.level !== "low" && !compact && <a className="secondary big call-button" href="#/pause">{t("pause.link")}</a>}
                <FamilyAlertButton verdict={outcome.verdict} />
                {!outcome.inconclusive && (
                  <RadarButton
                    level={outcome.verdict.level}
                    // Rule ids are recomputed here on the device from the checked text; AI verdicts add categories.
                    ids={[...scoreRules(checkedText).signals.map((s) => s.ruleId), ...outcome.verdict.signals.map((s) => s.id)]}
                  />
                )}
              </>
            }
          />
        )}
        {outcome && !outcome.inconclusive && checkedText && <FollowUp key={outcome.latencyMs} original={checkedText} verdict={outcome.verdict} />}
      </div>
      </div>

      {consent && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="consent-title">
          <div className="modal">
            <h2 id="consent-title">{t("consent.title")}</h2>
            <p>{t("consent.body")}</p>
            <div className="row">
              <button className="primary" onClick={() => consent(true)}>{t("consent.send")}</button>
              <button className="secondary" onClick={() => consent(false)}>{t("consent.keep")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
