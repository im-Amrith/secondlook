import { useEffect, useRef } from "react";
import { useT } from "../lib/useT";
import { useReadAloud } from "../lib/tts/useReadAloud";
import { Ico, Square, Volume2 } from "./icons";

/** Big "Read aloud" button. Speech runs on this device (open-source voices or the device's own). */
export function ReadAloud({ text, autoPlay = false }: { text: string; autoPlay?: boolean }) {
  const { t } = useT();
  const { speak, stop, state, offer, acceptOffer, dismissOffer, failed } = useReadAloud();
  const played = useRef(false);

  useEffect(() => {
    if (autoPlay && !played.current && text) {
      played.current = true;
      void speak(text);
    }
  }, [autoPlay, text, speak]);

  const downloading = state.progress !== null;
  return (
    <div className="read-aloud">
      {state.speaking ? (
        <button type="button" className="secondary speak-btn" onClick={stop}>
          <Ico icon={Square} /> {t("tts.stop")}
        </button>
      ) : (
        <button type="button" className="secondary speak-btn" onClick={() => void speak(text)} disabled={downloading}>
          <Ico icon={Volume2} /> {downloading ? t("tts.downloading", { pct: Math.round((state.progress ?? 0) * 100) }) : t("tts.read")}
        </button>
      )}
      {downloading && <progress className="tts-progress" max={1} value={state.progress ?? 0} aria-label={t("tts.loading")} />}
      {offer && (
        <div className="tts-offer" role="dialog" aria-label={t("tts.download")}>
          <p>{t("tts.offer", { lang: t(`tts.lang.${offer.lang}`), mb: offer.mb })}</p>
          <div className="row">
            <button type="button" className="primary" onClick={() => void acceptOffer()}>{t("tts.download")}</button>
            <button type="button" className="link-button" onClick={dismissOffer}>{t("tts.notNow")}</button>
          </div>
        </div>
      )}
      {failed && <p className="muted" role="status">{t("tts.failed")}</p>}
    </div>
  );
}
