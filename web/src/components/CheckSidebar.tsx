import type { LucideIcon } from "lucide-react";
import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import type { Key } from "../lib/i18n";
import { RadarTeaser } from "../pages/Radar";
import { ChevronRight, Cloud, GraduationCap, Ico, Phone, PhoneCall, Radar, ShieldCheck, Timer, Volume2 } from "./icons";

/** The Call Guard panel (also shown at the top of the check screen on phones). */
export function CallBanner() {
  const { t } = useT();
  return (
    <a className="call-banner" href="#/call">
      <span className="call-banner-icon"><Ico icon={PhoneCall} size={26} /></span>
      <strong>{t("call.bannerTitle")}</strong>
      <span className="call-banner-action">{t("call.bannerAction")}</span>
      <span className="call-banner-go"><Ico icon={ChevronRight} size={26} /></span>
    </a>
  );
}

function Tile({ href, icon, title, sub }: { href: string; icon: LucideIcon; title: Key; sub: Key }) {
  const { t } = useT();
  return (
    <a className="tile" href={href}>
      <span className="tile-icon"><Ico icon={icon} size={22} /></span>
      <span className="tile-text">
        <strong>{t(title)}</strong>
        <span>{t(sub)}</span>
      </span>
      <Ico icon={ChevronRight} className="tile-go" />
    </a>
  );
}

/**
 * The right-hand column of the check screen on laptops: Call Guard, what protects you right now
 * (and where checks run), and one-tap ways to the other tools. On phones it follows the form.
 */
export function CheckSidebar() {
  const app = useApp();
  const { t } = useT();
  const nanoReady = app.nano === "available";
  const cloudOn = app.aiConfigured && app.config.cloudEnabled && !app.settings.neverCloud;
  return (
    <aside className="check-side" aria-label={t("side.label")}>
      <div className="side-banner"><CallBanner /></div>

      <section className="card status-card" aria-labelledby="status-title">
        <h2 id="status-title">{t("side.protection")}</h2>
        <ul className="status-list">
          <li>
            <Ico icon={ShieldCheck} className={nanoReady ? "source-device" : "source-rules"} />
            <span><strong>{t("side.model")}</strong><span className="muted">{t(`nano.${app.nano}`)}</span></span>
            {!nanoReady && <a href="#/setup" className="status-link">{t("check.setUp")}</a>}
          </li>
          <li>
            <Ico icon={Cloud} className={cloudOn ? "source-cloud" : "source-rules"} />
            <span><strong>{t("side.cloud")}</strong><span className="muted">{cloudOn ? t("side.cloudOn") : t("side.cloudOff")}</span></span>
            <a href="#/settings" className="status-link">{t("side.change")}</a>
          </li>
          <li>
            <Ico icon={Volume2} className="source-rules" />
            <span><strong>{t("side.readAloud")}</strong><span className="muted">{app.settings.autoRead ? t("side.readAuto") : t("side.readButton")}</span></span>
          </li>
        </ul>
        <a href="#/how" className="icon-link small">{t("side.howPrivate")}</a>
      </section>

      <RadarTeaser />

      <nav className="tiles" aria-label={t("side.tools")}>
        <Tile href="#/pause" icon={Timer} title="side.pause" sub="side.pauseSub" />
        <Tile href="#/practice" icon={GraduationCap} title="side.practice" sub="side.practiceSub" />
        <Tile href="#/radar" icon={Radar} title="side.radar" sub="side.radarSub" />
        <a className="tile tile-help" href="tel:1930">
          <span className="tile-icon"><Ico icon={Phone} size={22} /></span>
          <span className="tile-text">
            <strong>{t("side.helpline")}</strong>
            <span>{t("side.helplineSub")}</span>
          </span>
        </a>
      </nav>
    </aside>
  );
}
