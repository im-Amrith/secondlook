import { useApp } from "../lib/app-context";
import { useT } from "../lib/useT";
import { LanguagePicker } from "../components/LanguagePicker";
import { VoiceSettings } from "../components/VoiceSettings";
import { TrustedSettings } from "../components/TrustedContact";
import { RADAR_REGIONS } from "@secondlook/shared";

function Toggle({ id, label, help, checked, onChange }: { id: string; label: string; help: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle">
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <strong>{label}</strong>
        <span className="muted">{help}</span>
      </label>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, config, aiConfigured } = useApp();
  const { t } = useT();
  return (
    <div className="page page-wide">
      <h1>{t("settings.title")}</h1>
      <div className="card-columns">
      <section className="card">
        <h2>{t("setup.language")}</h2>
        <LanguagePicker />
        <p className="muted">{t("settings.languageHelp")}</p>
      </section>
      <section className="card">
        <Toggle
          id="never-cloud"
          label={t("settings.neverCloud")}
          help={t("settings.neverCloudHelp")}
          checked={settings.neverCloud}
          onChange={(v) => updateSettings({ neverCloud: v })}
        />
        <Toggle
          id="family-alerts"
          label={t("settings.familyAlerts")}
          help={t("settings.familyAlertsHelp")}
          checked={settings.familyAlerts}
          onChange={(v) => updateSettings({ familyAlerts: v })}
        />
        <Toggle
          id="large-text"
          label={t("settings.largeText")}
          help={t("settings.largeTextHelp")}
          checked={settings.largeText}
          onChange={(v) => updateSettings({ largeText: v })}
        />
      </section>

      <TrustedSettings />
      <section className="card" aria-labelledby="radar-region-title">
        <h2 id="radar-region-title">{t("radar.settingsTitle")}</h2>
        <p className="muted">{t("radar.settingsHelp")}</p>
        <select aria-labelledby="radar-region-title" value={settings.radarRegion} onChange={(e) => updateSettings({ radarRegion: e.target.value })}>
          {RADAR_REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </section>
      <VoiceSettings />

      <section className="card">
        <h2>How checks are set up</h2>
        <dl className="facts">
          <dt>AI</dt><dd>{aiConfigured ? "Configured" : "Not configured (quick checks only)"}</dd>
          <dt>Cloud check</dt><dd>{config.cloudEnabled ? "Allowed" : "Switched off by SecondLook"}</dd>
          <dt>Cloud model</dt><dd>{config.cloudModel}</dd>
          <dt>Risk levels</dt><dd>Careful from {config.rules.thresholds?.medium}, scam from {config.rules.thresholds?.high}</dd>
          <dt>Prompt version</dt><dd>{config.promptVersion}</dd>
          <dt>Extra live rules</dt><dd>{config.rules.extraRules?.length ?? 0}</dd>
        </dl>
      </section>
      </div>
    </div>
  );
}
