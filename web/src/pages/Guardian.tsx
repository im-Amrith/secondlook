import { useEffect, useRef, useState } from "react";
import { useApp } from "../lib/app-context";
import { describeAlert, listenAlerts, type AlertDoc } from "../lib/family";
import { SourceIcon } from "../components/icons";

const SOURCE_TEXT = { ON_DEVICE: "checked on their device", IN_CLOUD: "checked in the cloud (details removed)", RULES: "quick check" } as const;
const SOURCE_ROUTE = { ON_DEVICE: "device", IN_CLOUD: "cloud", RULES: "rules" } as const;

/** Guardian dashboard: real-time alerts (metadata only) from circles you belong to. */
export function GuardianPage() {
  const { services, user } = useApp();
  const [alerts, setAlerts] = useState<AlertDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!services || !user) return;
    const unsub = listenAlerts(
      services.db,
      user.uid,
      (list) => {
        const fresh = list.filter((a) => a.id && !seen.current.has(a.id) && a.fromUid !== user.uid);
        if (seen.current.size > 0 && fresh.length && "Notification" in window && Notification.permission === "granted") {
          for (const a of fresh) new Notification("SecondLook alert", { body: describeAlert(a) });
        }
        list.forEach((a) => a.id && seen.current.add(a.id));
        setAlerts(list);
      },
      (e) => setError(e.message),
    );
    const t = setInterval(() => tick((x) => x + 1), 30_000);
    return () => { unsub(); clearInterval(t); };
  }, [services, user]);

  if (!services) return <div className="page"><h1>Alerts</h1><div className="notice">Alerts need Firebase to be configured.</div></div>;
  if (!user) return <div className="page"><h1>Alerts</h1><p>Please <a href="#/family">sign in on the Family page</a> first.</p></div>;

  return (
    <div className="page">
      <h1>Family alerts</h1>
      <p className="lead">Live alerts from the people you look out for. You see the warning signs, never their messages.</p>
      {"Notification" in window && Notification.permission === "default" && (
        <button className="secondary" onClick={() => void Notification.requestPermission().then(() => tick((x) => x + 1))}>Notify me on this computer</button>
      )}
      {error && <p className="notice notice-error">{error}</p>}
      {alerts === null && <p className="muted">Listening…</p>}
      {alerts?.length === 0 && <p className="muted">No alerts yet. That's good news.</p>}
      <ul className="alerts">
        {alerts?.map((a) => (
          <li key={a.id} className={`alert alert-${a.level}`}>
            <strong>{describeAlert(a)}</strong>
            <span className="muted">Risk {a.score}/100 · <SourceIcon route={SOURCE_ROUTE[a.source]} /> {SOURCE_TEXT[a.source]} · {a.platform}</span>
            <span>Give them a call and check they're OK. Don't ask them to forward the message.</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
