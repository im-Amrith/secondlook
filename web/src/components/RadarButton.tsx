import { useState } from "react";
import { classifyPattern, isoWeek, isRadarRegion } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import { radarPatternText } from "../lib/i18n";
import { Check, Ico, Radar } from "./icons";

/**
 * "Add to the scam radar": one tap shares the TYPE of scam (worked out here, on the device), the
 * week and the region chosen in Settings. Never the message. Only for medium/high results.
 */
export function RadarButton({ ids, level }: { ids: string[]; level: "low" | "medium" | "high" }) {
  const { services, settings } = useApp();
  const { t, lang } = useT();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (level === "low" || !services) return null;
  const pattern = classifyPattern(ids);
  const region = isRadarRegion(settings.radarRegion) ? settings.radarRegion : "IN";

  if (state === "sent") return <p className="family-sent" role="status"><Ico icon={Check} /> {t("radar.added")} <a href="#/radar">{t("radar.see")}</a></p>;
  return (
    <div className="radar-add">
      <button
        type="button"
        className="secondary big"
        disabled={state === "sending"}
        onClick={async () => {
          setState("sending");
          try {
            const { reportToRadar } = await import("../lib/radar");
            await reportToRadar(services.db, isoWeek(new Date()), pattern, region);
            setState("sent");
          } catch {
            setState("error");
          }
        }}
      >
        <Ico icon={Radar} /> {t("radar.add")}
      </button>
      <p className="muted small">{t("radar.addNote", { type: radarPatternText(pattern, lang) })}</p>
      {state === "error" && <p className="notice notice-error">{t("radar.error")}</p>}
    </div>
  );
}
