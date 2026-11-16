import { useApp } from "../lib/app-context";

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
  return (
    <div className="page">
      <h1>Settings</h1>
      <section className="card">
        <Toggle
          id="never-cloud"
          label="Never use the cloud"
          help="Checks stay on this device. If the private model isn't available, you get a quick rules check instead."
          checked={settings.neverCloud}
          onChange={(v) => updateSettings({ neverCloud: v })}
        />
        <Toggle
          id="family-alerts"
          label="Offer to tell my family"
          help="After a risky result, show a button to alert your family circle (warning signs only)."
          checked={settings.familyAlerts}
          onChange={(v) => updateSettings({ familyAlerts: v })}
        />
        <Toggle
          id="large-text"
          label="Extra large text"
          help="Makes everything bigger."
          checked={settings.largeText}
          onChange={(v) => updateSettings({ largeText: v })}
        />
      </section>

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
  );
}
