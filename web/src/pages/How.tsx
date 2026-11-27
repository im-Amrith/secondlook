import { decideRoute, deviceBudget, type RouteDecision, type RouteInput } from "@secondlook/shared";
import { useApp } from "../lib/app-context";
import { NANO_STATUS_TEXT } from "../lib/nano";
import { SourceIcon } from "../components/icons";

const ROUTE_LABEL: Record<RouteDecision["route"], string> = {
  device: "On this device",
  cloud: "Personal details removed, then cloud",
  rules: "Quick check on this device",
};

/** The privacy router, live: what WOULD happen on this device right now, for a few typical cases. */
export function HowPage() {
  const app = useApp();
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const base: RouteInput = {
    platform: "web",
    nanoAvailable: !!app.device && app.nano === "available",
    lang: "en",
    estTokens: 120,
    inputType: "text",
    multiTurn: false,
    userNeverCloud: app.settings.neverCloud,
    online,
    cloudEnabled: app.config.cloudEnabled && app.aiConfigured,
  };
  const cases: { label: string; input: Partial<RouteInput> }[] = [
    { label: "A short message in English", input: {} },
    { label: "A screenshot", input: { inputType: "image" } },
    { label: "A message in Hindi (देवनागरी)", input: { lang: "hi" } },
    { label: "A long chat (about 9,000 words)", input: { estTokens: 12000 } },
    { label: "A very long chat history (about 30,000 words)", input: { estTokens: 40000 } },
    { label: "A follow-up question about a result", input: { multiTurn: true } },
    { label: "Any message, if you go offline", input: { online: false } },
  ];

  return (
    <div className="page page-wide">
      <h1>How SecondLook keeps your messages private</h1>
      <p className="lead">Every check starts with quick rules on your device. Then a small router decides where the AI check runs, and tells you why.</p>

      <div className="card-grid">
      <section className="card">
        <h2>This device right now</h2>
        <dl className="facts">
          <dt>Private model</dt><dd>{NANO_STATUS_TEXT[app.nano]}{app.simulatedNano ? " (simulated, dev only)" : ""}</dd>
          <dt>Cloud check</dt><dd>{!app.aiConfigured ? "Not set up" : app.settings.neverCloud ? "Off (your setting)" : app.config.cloudEnabled ? "Allowed, after removing personal details" : "Switched off by SecondLook"}</dd>
          <dt>Internet</dt><dd>{online ? "Connected" : "Offline"}</dd>
          <dt>On-device limit</dt><dd>About {deviceBudget("web").toLocaleString()} tokens per check (longer text is split into up to 3 parts)</dd>
        </dl>
      </section>

      <section className="card">
        <h2>Where each kind of check would run</h2>
        <table className="route-table">
          <thead><tr><th>If you check…</th><th>It runs…</th><th>Why</th></tr></thead>
          <tbody>
            {cases.map((c) => {
              const d = decideRoute({ ...base, ...c.input });
              return (
                <tr key={c.label} data-route={d.route}>
                  <td>{c.label}</td>
                  <td className="nowrap"><SourceIcon route={d.route} /> {ROUTE_LABEL[d.route]}</td>
                  <td className="muted">{d.reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted">These rows come from the same code that routes your real checks, using this device's current state.</p>
      </section>

      <section className="card">
        <h2>What leaves your device</h2>
        <ul className="steps">
          <li><strong><SourceIcon route="device" /> On this device:</strong> nothing.</li>
          <li><strong><SourceIcon route="cloud" /> Cloud:</strong> the message with phone numbers, emails, UPI IDs, card and account numbers, codes, Aadhaar, PAN and names replaced by labels like <code>[PHONE_1]</code>. You can read exactly what was sent under every cloud result. Screenshots are only sent if you say yes.</li>
          <li><strong><SourceIcon route="rules" /> Quick check:</strong> nothing.</li>
          <li><strong>Family alerts</strong> (only if you press the button): the risk level, the kinds of warning signs, and the time. Never the message.</li>
        </ul>
      </section>
      </div>
    </div>
  );
}
