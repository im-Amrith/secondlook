import { useState } from "react";
import { useApp } from "../lib/app-context";
import { NANO_STATUS_TEXT } from "../lib/nano";

/** Onboarding: explain the privacy model and download Gemini Nano on a user gesture. */
export function SetupPage() {
  const app = useApp();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onDownload() {
    if (!app.device) return;
    setError(null);
    setProgress(0);
    // initializeDeviceModel() must start inside the click handler (user gesture).
    app.device
      .initialize((p) => setProgress(p))
      .then(async () => {
        if (app.simulatedNano) app.setNano("available");
        else await app.refreshNano();
        setProgress(1);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setProgress(null);
        void app.refreshNano();
      });
  }

  const canDownload = !!app.device && (app.nano === "downloadable" || app.nano === "downloading");

  return (
    <div className="page">
      <h1>Welcome to SecondLook</h1>
      <p className="lead">A second pair of eyes before you pay, share a code, or click a link.</p>

      <ol className="steps">
        <li><strong>Checks happen on your device first.</strong> A small private AI model reads the message right here. Nothing is uploaded.</li>
        <li><strong>If your device can't do it,</strong> we remove phone numbers, account numbers, names and codes first, then ask a bigger model in the cloud. You can always see exactly what was sent, or switch the cloud off.</li>
        <li><strong>Your family can be told, not shown.</strong> If you want, someone you trust gets a short alert with the warning signs only. Never your messages.</li>
      </ol>

      <section className="card">
        <h2>The private model</h2>
        <p>Status: <strong data-testid="nano-status">{NANO_STATUS_TEXT[app.nano]}</strong>{app.simulatedNano && " (simulated, dev only)"}</p>
        {!app.aiConfigured && !app.simulatedNano && <p className="muted">AI isn't configured in this build, so only quick checks are available.</p>}
        {canDownload && progress === null && (
          <button className="primary big" onClick={onDownload}>Download the private model (one time)</button>
        )}
        {progress !== null && progress < 1 && (
          <div className="meter" aria-label="Download progress">
            <div className="meter-track"><div className="meter-fill" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <span className="meter-num">{Math.round(progress * 100)}%</span>
          </div>
        )}
        {app.nano === "available" && <p className="ok">✔ Ready. Your checks stay on this device.</p>}
        {(app.nano === "unsupported" || app.nano === "unavailable") && (
          <p className="muted">
            That's fine: SecondLook still works. Personal details are removed before the cloud check, or turn the cloud off in Settings for quick checks only.
            The private model needs desktop Chrome 139 or newer on a capable computer.
          </p>
        )}
        {error && <p className="notice notice-error" role="alert">The download didn't finish: {error}</p>}
      </section>

      <button
        className="primary big"
        onClick={() => {
          app.updateSettings({ onboarded: true });
          location.hash = "#/";
        }}
      >
        Start checking messages
      </button>
    </div>
  );
}
