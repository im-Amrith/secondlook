import { useEffect, useState } from "react";
import { RADAR_REGIONS, radarWeeks, summariseRadar, type RadarRow } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import { radarPatternText } from "../lib/i18n";
import { Ico, Radar, SourceIcon, TrendingDown, TrendingUp } from "../components/icons";

/** Load this week's and last week's counters (null while loading, [] when unavailable). */
export function useRadar(region?: string): { rows: RadarRow[] | null; error: boolean } {
  const { services } = useApp();
  const [rows, setRows] = useState<RadarRow[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!services) return;
    let alive = true;
    const weeks = radarWeeks(new Date());
    import("../lib/radar")
      .then((r) => r.loadRadar(services.db, weeks))
      .then((counts) => alive && setRows(summariseRadar(counts, weeks, region)))
      .catch(() => alive && (setError(true), setRows([])));
    return () => {
      alive = false;
    };
  }, [services, region]);
  return { rows, error };
}

/** Scam radar: which kinds of scam people are reporting this week, across India or in one state. */
export function RadarPage() {
  const { services, settings, aiConfigured } = useApp();
  const { t, lang } = useT();
  const [region, setRegion] = useState(settings.radarRegion && settings.radarRegion !== "IN" ? settings.radarRegion : "");
  const { rows, error } = useRadar(region || undefined);
  const max = Math.max(1, ...(rows ?? []).map((r) => r.thisWeek));
  const regionName = RADAR_REGIONS.find((r) => r.id === region)?.name;

  return (
    <div className="page page-wide">
      <h1><Ico icon={Radar} className="h1-ico" /> {t("radar.title")}</h1>
      <p className="lead">{t("radar.lead")}</p>
      <p className="badge badge-device"><SourceIcon route="device" /> {t("radar.private")}</p>

      <div className="split">
      <div className="split-main">
      <label className="label" htmlFor="radar-region">{t("radar.region")}</label>
      <select id="radar-region" value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="">{t("radar.allIndia")}</option>
        {RADAR_REGIONS.filter((r) => r.id !== "IN").map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      {!aiConfigured || !services ? (
        <p className="notice">{t("radar.offline")}</p>
      ) : rows === null ? (
        <p className="muted">{t("radar.loading")}</p>
      ) : error ? (
        <p className="notice notice-error">{t("radar.loadError")}</p>
      ) : rows.length === 0 ? (
        <p className="notice">{t("radar.empty")}</p>
      ) : (
        <ol className="radar-list" aria-label={t("radar.title")}>
          {rows.map((r) => {
            const trend = r.thisWeek > r.lastWeek ? <Ico icon={TrendingUp} /> : r.thisWeek < r.lastWeek ? <Ico icon={TrendingDown} /> : null;
            return (
              <li key={r.pattern} className="radar-row">
                <div className="radar-head">
                  <strong>{radarPatternText(r.pattern, lang)}</strong>
                  <span className="radar-num">{t("radar.reports", { n: r.thisWeek })}</span>
                </div>
                <div className="meter-track" aria-hidden><div className="meter-fill radar-fill" style={{ width: `${(r.thisWeek / max) * 100}%` }} /></div>
                <p className="muted small">
                  {t("radar.lastWeek", { n: r.lastWeek })} {trend}
                  {regionName && ` · ${t("radar.inRegion", { n: r.inRegion, region: regionName })}`}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      </div>
      <div className="split-side">
      <section className="card">
        <h2>{t("radar.howTitle")}</h2>
        <p>{t("radar.how")}</p>
        <p className="muted small">{t("radar.disclaimer")}</p>
      </section>
      </div>
      </div>
    </div>
  );
}

/** One-line teaser for the check screen: the most reported scam this week. */
export function RadarTeaser() {
  const { t, lang } = useT();
  const { rows } = useRadar();
  const top = rows?.find((r) => r.thisWeek > 0);
  if (!top) return null;
  return (
    <p className="radar-teaser">
      <a href="#/radar"><Ico icon={Radar} /> {t("radar.teaser", { type: radarPatternText(top.pattern, lang), n: top.thisWeek })}</a>
    </p>
  );
}
